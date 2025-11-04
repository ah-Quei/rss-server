const express = require('express');
const Feed = require('../models/Feed');
const { authenticateToken } = require('../middleware/auth');
const rssService = require('../services/rssService');
const logger = require('../utils/logger');

const router = express.Router();


// 验证RSS URL
router.get('/validate', authenticateToken, async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL参数是必需的'
            });
        }

        await rssService.validateRssUrl(url);
        res.json({
            success: true,
            message: 'RSS源验证成功'
        });
    } catch (error) {
        logger.error('验证RSS URL错误:', { error });
        res.status(400).json({
            success: false,
            message: error.message || '无效的RSS URL或无法访问'
        });
    }
});

// 获取用户的所有订阅源
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await Feed.findByUserId(req.user.id, {
      category,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 如果使用了分页，返回分页结果中的data字段
    const feeds = result.data ? result.data : result;
    res.json({ feeds });
  } catch (error) {
    logger.error('获取订阅源错误:', { error });
    res.status(500).json({ error: '获取订阅源失败' });
  }
});

// 创建新的订阅源
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, url, category, refreshInterval, scriptId } = req.body;

    if (!title || !url) {
      return res.status(400).json({ error: '标题和URL都是必填项' });
    }

    // 验证刷新频率
    if (refreshInterval && (refreshInterval < 15 || refreshInterval > 1440)) {
      return res.status(400).json({ error: '刷新频率必须在15分钟到24小时之间' });
    }

    // 验证RSS URL
    try {
      await rssService.validateRssUrl(url);
    } catch (error) {
      return res.status(400).json({ error: '无效的RSS URL或无法访问' });
    }

    const feedId = await Feed.create({
      userId: req.user.id,
      title,
      url,
      category,
      refreshInterval,
      scriptId
    });

    const feed = await Feed.findById(feedId, req.user.id);
    res.status(201).json({ message: '订阅源创建成功', feed });
  } catch (error) {
    logger.error('创建订阅源错误:', { error });
    res.status(500).json({ error: '创建订阅源失败' });
  }
});

// 获取单个订阅源
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id, req.user.id);
    
    if (!feed) {
      return res.status(404).json({ error: '订阅源不存在' });
    }

    res.json({ feed });
  } catch (error) {
    logger.error('获取订阅源错误:', { error });
    res.status(500).json({ error: '获取订阅源失败' });
  }
});

// 更新订阅源
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, url, category, refreshInterval, scriptId, status } = req.body;

    const feed = await Feed.findById(req.params.id, req.user.id);
    if (!feed) {
      return res.status(404).json({ error: '订阅源不存在' });
    }

    // 验证刷新频率
    if (refreshInterval && (refreshInterval < 15 || refreshInterval > 1440)) {
      return res.status(400).json({ error: '刷新频率必须在15分钟到24小时之间' });
    }

    // 如果URL发生变化，验证新URL
    if (url && url !== feed.url) {
      try {
        await rssService.validateRssUrl(url);
      } catch (error) {
        return res.status(400).json({ error: '无效的RSS URL或无法访问' });
      }
    }

    await Feed.update(req.params.id, req.user.id, {
      title: title || feed.title,
      url: url || feed.url,
      category: category || feed.category,
      refreshInterval: refreshInterval !== undefined ? refreshInterval : feed.refresh_interval,
      scriptId: scriptId !== undefined ? scriptId : feed.script_id,
      status: status || feed.status
    });

    const updatedFeed = await Feed.findById(req.params.id, req.user.id);
    res.json({ message: '订阅源更新成功', feed: updatedFeed });
  } catch (error) {
    logger.error('更新订阅源错误:', { error });
    res.status(500).json({ error: '更新订阅源失败' });
  }
});

// 删除订阅源
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id, req.user.id);
    if (!feed) {
      return res.status(404).json({ error: '订阅源不存在' });
    }

    await Feed.delete(req.params.id, req.user.id);
    res.json({ message: '订阅源删除成功' });
  } catch (error) {
    logger.error('删除订阅源错误:', { error });
    res.status(500).json({ error: '删除订阅源失败' });
  }
});

// 手动刷新订阅源
router.post('/:id/refresh', authenticateToken, async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id, req.user.id);
    if (!feed) {
      return res.status(404).json({ error: '订阅源不存在' });
    }

    const result = await rssService.fetchFeed(feed);
    res.json({ 
      message: '刷新完成', 
      articlesCount: result.newArticles,
      lastFetch: new Date().toISOString()
    });
  } catch (error) {
    logger.error('刷新订阅源错误:', { error });
    res.status(500).json({ error: '刷新订阅源失败' });
  }
});

// 获取用户的所有分类
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const categories = await Feed.getCategories(req.user.id);
    res.json({ categories });
  } catch (error) {
    logger.error('获取分类错误:', { error });
    res.status(500).json({ error: '获取分类失败' });
  }
});

module.exports = router;