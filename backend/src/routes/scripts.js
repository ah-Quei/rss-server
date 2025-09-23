const express = require('express');
const Feed = require('../models/Feed');
const Article = require('../models/Article');
const Script = require('../models/Script');
const { authenticateToken } = require('../middleware/auth');
const scriptService = require('../services/scriptService');
const Parser = require("rss-parser");

const router = express.Router();

// 测试脚本
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { script, feedId, url } = req.body;

    if (!script) {
      return res.status(400).json({ 
        success: false,
        message: '脚本内容不能为空' 
      });
    }

    // 如果提供了feedId，验证是否属于当前用户
    if (feedId) {
      const feed = await Feed.findById(feedId, req.user.id);
      if (!feed) {
        return res.status(404).json({ 
          success: false,
          message: '订阅源不存在' 
        });
      }
    }

    // 获取测试数据
    let testArticles;
    if (feedId) {
      const result = await Article.findByFeedId(feedId, { limit: 20 });
      // 如果使用了分页，提取data字段；否则直接使用结果
      testArticles = result.data ? result.data : result;
    } else if (url) {
        testArticles = []
        let parser = new Parser({
            timeout: 10000,
            headers: {
                'User-Agent': 'RSS-Service/1.0'
            }
        });
        //在添加订阅源时候的测试，此时还没抓取,因此没有feedId
        const parsedFeed = await parser.parseURL(url);

        for (const item of parsedFeed.items.slice(0, 5)) {
            // 创建文章数据
            const articleData = {
                feedId: null,
                title: item.title || '无标题',
                link: item.link || '',
                description: item.description|| item.summary||item.contentSnippet || item.content  || '',
                pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                guid: item.guid || item.link || '',
                content: item.content || '',
                rawItem: item // 保存原始item对象
            };

            testArticles.push(articleData)
        }
    } else {
      return res.status(400).json({ 
        success: false,
        message: '需要提供feedId或url参数' 
      });
    }



    if (!testArticles || !Array.isArray(testArticles) || testArticles.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: '没有可用于测试的文章数据' 
        });
    }

    // 执行脚本测试
    const results = [];
    for (const article of testArticles) {
      try {
        
        const result = await scriptService.executeScript(script, article, article.rawItem);
        results.push({
          articleId: article.id,
          articleTitle: article.title,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          articleId: article.id,
          articleTitle: article.title,
          success: false,
          error: error.message
        });
      }
    }

    res.json({ 
      success: true,
      message: '脚本测试完成',
      results: results
    });
  } catch (error) {
    console.error('脚本测试错误:', error);
    res.status(500).json({ 
      success: false,
      message: '脚本测试失败',
      error: error.message 
    });
  }
});

// 获取脚本执行日志
router.get('/logs/:feedId', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 验证订阅源是否属于当前用户
    const feed = await Feed.findById(req.params.feedId, req.user.id);
    if (!feed) {
      return res.status(404).json({ error: '订阅源不存在' });
    }

    const logs = await scriptService.getExecutionLogs(req.params.feedId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ logs });
  } catch (error) {
    console.error('获取脚本日志错误:', error);
    res.status(500).json({ error: '获取脚本日志失败' });
  }
});


// 创建脚本
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, script } = req.body;

    if (!name || !script) {
      return res.status(400).json({ 
        success: false,
        message: '脚本名称和内容不能为空' 
      });
    }

    const scriptData = {
      name,
      description: description || '',
      script,
      userId: req.user.id
    };

    const newScript = await Script.create(scriptData);
    res.status(201).json({ 
      success: true,
      message: '脚本创建成功',
      data: newScript 
    });
  } catch (error) {
    console.error('创建脚本错误:', error);
    res.status(500).json({ 
      success: false,
      message: '创建脚本失败',
      error: error.message 
    });
  }
});

// 获取脚本列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search = '' } = req.query;
    const options = { search };

    // 查询数据库里的用户脚本
    const result = await Script.findByUserId(req.user.id, options);
    
    // 直接使用数据库中的脚本
    const script = result;

    res.json({ script });
  } catch (error) {
    console.error('获取脚本列表错误:', error);
    res.status(500).json({ error: '获取脚本列表失败' });
  }
});

// 获取单个脚本
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    
    if (!script) {
      return res.status(404).json({ error: '脚本不存在' });
    }

    // 检查权限
    const hasPermission = await Script.checkOwnership(req.params.id, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ error: '无权限访问此脚本' });
    }

    res.json({ script });
  } catch (error) {
    console.error('获取脚本错误:', error);
    res.status(500).json({ error: '获取脚本失败' });
  }
});

// 更新脚本
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, script } = req.body;

    // 检查权限
    const hasPermission = await Script.checkOwnership(req.params.id, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false,
        message: '无权限修改此脚本' 
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (script !== undefined) updateData.script = script;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false,
        message: '没有提供要更新的数据' 
      });
    }

    const updatedScript = await Script.update(req.params.id, updateData);
    res.json({ 
      success: true,
      message: '脚本更新成功',
      data: updatedScript 
    });
  } catch (error) {
    console.error('更新脚本错误:', error);
    res.status(500).json({ 
      success: false,
      message: '更新脚本失败',
      error: error.message 
    });
  }
});

// 删除脚本
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // 检查权限
    const hasPermission = await Script.checkOwnership(req.params.id, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ error: '无权限删除此脚本' });
    }

    await Script.delete(req.params.id,req.user.id);
    res.json({ message: '脚本删除成功' });
  } catch (error) {
    console.error('删除脚本错误:', error);
    res.status(500).json({ error: '删除脚本失败' });
  }
});

module.exports = router;