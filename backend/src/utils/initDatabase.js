const database = require('./database');
const fs = require('fs');
const path = require('path');

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

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 确保数据库目录存在
    const dbDir = path.dirname(path.join(__dirname, '../../database/rss_service.db'));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 连接数据库
    await database.connect();
    console.log('数据库连接成功');

    // 创建用户表
    await database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('用户表创建完成');

    // 创建脚本表
    await database.run(`
      CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        script TEXT NOT NULL ,
        is_template BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('脚本表创建完成');

    // 创建订阅源表
    await database.run(`
      CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        category VARCHAR(100) DEFAULT '默认',
        refresh_interval INTEGER DEFAULT 60,
        script_id INTEGER,
        status VARCHAR(20) DEFAULT 'active',
        last_fetch DATETIME,
        fetch_status VARCHAR(20) DEFAULT 'pending',
        fetch_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE SET NULL
      )
    `);
    console.log('订阅源表创建完成');

    // 创建文章表
    await database.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        link TEXT,
        description TEXT,
        content TEXT,
        raw_json TEXT,
        pub_date DATETIME,
        guid VARCHAR(255),
        processed BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE
      )
    `);
    console.log('文章表创建完成');

    // 创建脚本执行日志表
    await database.run(`
      CREATE TABLE IF NOT EXISTS script_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        script_content TEXT,
        execution_result TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE
      )
    `);
    console.log('脚本日志表创建完成');

    // 创建索引以提高查询性能
    await database.run('CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds (user_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds (status)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_feeds_script_id ON feeds (script_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles (feed_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles (pub_date)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles (guid)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_processed ON articles (processed)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_script_logs_feed_id ON script_logs (feed_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts (user_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_scripts_is_template ON scripts (is_template)');
    console.log('数据库索引创建完成');

    // 插入系统模板
    console.log('开始插入系统模板...');
    const existingTemplates = await database.all('SELECT * FROM scripts WHERE is_template = 1');
    
    if (existingTemplates.length === 0) {
      for (const template of systemTemplates) {
        await database.run(
          'INSERT INTO scripts (user_id, name, description, script, is_template, created_at, updated_at) VALUES (?, ?, ?, ?, 1, datetime("now"), datetime("now"))',
          [1, template.name, template.description, template.script]
        );
        console.log(`插入系统模板: ${template.name}`);
      }
      console.log('系统模板插入完成');
    } else {
      console.log(`已存在 ${existingTemplates.length} 个系统模板，跳过插入`);
    }

    console.log('数据库初始化完成！');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  } finally {
    await database.close();
  }
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('数据库初始化成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;