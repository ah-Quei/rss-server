/**
 * 数据库迁移脚本 - 将feed表中的script字段迁移到新的scripts表
 * 
 * 此脚本执行以下操作：
 * 1. 创建新的scripts表（如果不存在）
 * 2. 从feeds表中提取所有包含script的记录
 * 3. 为每个script创建一条新记录到scripts表
 * 4. 更新feeds表，将script字段替换为script_id外键
 * 5. 插入系统模板脚本到scripts表
 */

const database = require('./database');
const logger = require('./logger');

// 系统模板定义
const systemTemplates = [
  {
    name: '基础过滤器',
    description: '根据关键词过滤文章',
    script: `// 基础过滤器示例
function processArticle(article, rawItem) {
  const keywords = ['技术', '编程', 'JavaScript'];
  let hasKeyword = keywords.some(keyword => 
    article.title.includes(keyword) || 
    article.description.includes(keyword)
  );
  if (rawItem && rawItem.categories) {
    const categoryMatch = rawItem.categories.some(cat => 
      keywords.some(keyword => cat.includes(keyword))
    );
    if (categoryMatch) hasKeyword = true;
  }
  return hasKeyword
    ? { action: 'keep', article }
    : { action: 'filter', reason: '不包含指定关键词' };
}`
  },
  {
    name: 'Webhook推送',
    description: '将文章推送到外部服务',
    script: `// Webhook推送示例
function processArticle(article, rawItem) {
  const payload = {
    title: article.title,
    link: article.link,
    description: article.description,
    pubDate: article.pub_date,
    categories: rawItem ? rawItem.categories : [],
    author: rawItem ? rawItem.creator : null,
    enclosure: rawItem ? rawItem.enclosure : null
  };
  webhook('https://your-webhook-url.com/api/notify', payload);
  return { action: 'keep', article, webhook: true };
}`
  },
  {
    name: 'OpenAI智能摘要',
    description: '使用OpenAI生成文章摘要',
    script: `// OpenAI智能摘要示例
function processArticle(article, rawItem) {
  const client = openai.createClient('your-openai-api-key');
  let contentToSummarize = article.title + article.description;
  if (rawItem && rawItem.categories) {
    contentToSummarize += '分类: ' + rawItem.categories.join(', ');
  }
  if (rawItem && rawItem.creator) {
    contentToSummarize += '作者: ' + rawItem.creator;
  }
  const summary = client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: '请为以下文章生成简洁的摘要，不超过100字。' },
      { role: 'user', content: contentToSummarize }
    ],
    max_tokens: 150
  });
  return {
    action: 'keep',
    article: { ...article, description: summary.choices[0].message.content }
  };
}`
  },
  {
    name: '标题前缀添加',
    description: '为文章标题添加前缀',
    script: `// 标题前缀添加示例
function processArticle(article, rawItem) {
  const prefix = '[RSS]';
  const newTitle = prefix + ' ' + article.title;
  const maxLength = 200;
  let newDescription = article.description;
  if (newDescription.length > maxLength) {
    newDescription = newDescription.substring(0, maxLength) + '...';
  }
  if (rawItem && rawItem.creator) {
    newDescription += '作者: ' + rawItem.creator;
  }
  return {
    action: 'keep',
    article: { ...article, title: newTitle, description: newDescription }
  };
}`
  }
];

async function migrateScripts() {
  try {
    logger.info('开始数据库迁移...');
    
    // 连接数据库
    await database.connect();
    logger.info('数据库连接成功');

    // 检查是否已经存在scripts表
    const scriptsTableExists = await database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='scripts'"
    );
    
    // 如果scripts表不存在，创建它
    if (!scriptsTableExists) {
      logger.info('创建scripts表...');
      await database.run(`
        CREATE TABLE IF NOT EXISTS scripts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          script TEXT NOT NULL,
          is_template BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      logger.info('scripts表创建完成');
      
      // 创建索引
      await database.run('CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts (user_id)');
      await database.run('CREATE INDEX IF NOT EXISTS idx_scripts_is_template ON scripts (is_template)');
    } else {
      logger.info('scripts表已存在，跳过创建');
    }

    // 检查feeds表是否有script_id字段
    const feedsColumns = await database.all("PRAGMA table_info(feeds)");
    const hasScriptIdColumn = feedsColumns.some(col => col.name === 'script_id');
    
    // 如果没有script_id字段，添加它
    if (!hasScriptIdColumn) {
      logger.info('向feeds表添加script_id字段...');
      await database.run('ALTER TABLE feeds ADD COLUMN script_id INTEGER REFERENCES scripts(id) ON DELETE SET NULL');
      await database.run('CREATE INDEX IF NOT EXISTS idx_feeds_script_id ON feeds (script_id)');
      logger.info('script_id字段添加完成');
    } else {
      logger.info('feeds表已有script_id字段，跳过添加');
    }

    // 获取所有包含script的feeds
    const feedsWithScripts = await database.all(
      "SELECT id, user_id, title, script FROM feeds WHERE script IS NOT NULL AND script != ''"
    );
    
    logger.info(`找到 ${feedsWithScripts.length} 个包含脚本的订阅源`);
    
    // 为每个脚本创建一条记录并更新feed
    for (const feed of feedsWithScripts) {
      if (!feed.script) continue;
      
      logger.debug(`处理订阅源 ID: ${feed.id}, 标题: ${feed.title}`);
      
      // 创建脚本记录
      const scriptName = `${feed.title} 的处理脚本`;
      const result = await database.run(
        'INSERT INTO scripts (user_id, name, description, script, is_template, created_at, updated_at) VALUES (?, ?, ?, ?, 0, datetime("now"), datetime("now"))',
        [feed.user_id, scriptName, `自动从订阅源 "${feed.title}" 迁移的脚本`, feed.script]
      );
      
      const scriptId = result.id;
      logger.info(`创建脚本记录，ID: ${scriptId}`);
      
      // 更新feed记录，设置script_id并清空script字段
      await database.run(
        'UPDATE feeds SET script_id = ?, script = NULL WHERE id = ?',
        [scriptId, feed.id]
      );
      
      logger.info(`更新订阅源 ID: ${feed.id} 的script_id为 ${scriptId}`);
    }
    
    // 插入系统模板
    logger.info('开始插入系统模板...');
    const existingTemplates = await database.all('SELECT * FROM scripts WHERE is_template = 1');
    
    if (existingTemplates.length === 0) {
      for (const template of systemTemplates) {
        await database.run(
          'INSERT INTO scripts (user_id, name, description, script, is_template, created_at, updated_at) VALUES (?, ?, ?, ?, 1, datetime("now"), datetime("now"))',
          [1, template.name, template.description, template.script]
        );
        logger.info(`插入系统模板: ${template.name}`);
      }
      logger.info('系统模板插入完成');
    } else {
      logger.info(`已存在 ${existingTemplates.length} 个系统模板，跳过插入`);
    }
    
    logger.info('数据迁移完成！');
    
  } catch (error) {
    logger.error('数据库迁移失败:', { error });
    throw error;
  } finally {
    await database.close();
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  migrateScripts()
    .then(() => {
      logger.info('数据库迁移成功');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('数据库迁移失败:', { error });
      process.exit(1);
    });
}

module.exports = migrateScripts;