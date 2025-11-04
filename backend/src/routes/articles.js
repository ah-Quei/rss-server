const express = require('express');
const Article = require('../models/Article');
const Feed = require('../models/Feed');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取用户的文章列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      feedId 
    } = req.query;
    
    const offset = (page - 1) * limit;

    let articles, total;
    if (feedId) {
      // 验证订阅源是否属于当前用户
      const feed = await Feed.findById(feedId, req.user.id);
      if (!feed) {
        return res.status(404).json({ error: '订阅源不存在' });
      }
      
      articles = await Article.findByFeedId(feedId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      // TODO: 为feedId情况也添加总数统计
      total = articles.length;
    } else {
      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        category,
        search
      };
      
      articles = await Article.findByUserId(req.user.id, options);
      total = await Article.countByUserId(req.user.id, { category, search });
    }

    res.json({ 
      articles, 
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('获取文章错误:', { error });
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 获取单篇文章详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 验证文章是否属于当前用户的订阅源
    const feed = await Feed.findById(article.feed_id, req.user.id);
    if (!feed) {
      return res.status(403).json({ error: '无权访问此文章' });
    }

    res.json({ article });
  } catch (error) {
    logger.error('获取文章详情错误:', { error });
    res.status(500).json({ error: '获取文章详情失败' });
  }
});

// 标记文章为已读
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 验证文章是否属于当前用户的订阅源
    const feed = await Feed.findById(article.feed_id, req.user.id);
    if (!feed) {
      return res.status(403).json({ error: '无权访问此文章' });
    }

    await Article.markAsRead(req.params.id);
    res.json({ message: '文章已标记为已读' });
  } catch (error) {
    logger.error('标记文章已读错误:', { error });
    res.status(500).json({ error: '标记文章已读失败' });
  }
});

// 标记文章为未读
router.put('/:id/unread', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 验证文章是否属于当前用户的订阅源
    const feed = await Feed.findById(article.feed_id, req.user.id);
    if (!feed) {
      return res.status(403).json({ error: '无权访问此文章' });
    }

    await Article.markAsUnread(req.params.id);
    res.json({ message: '文章已标记为未读' });
  } catch (error) {
    logger.error('标记文章未读错误:', { error });
    res.status(500).json({ error: '标记文章未读失败' });
  }
});

// 删除文章
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 验证文章是否属于当前用户的订阅源
    const feed = await Feed.findById(article.feed_id, req.user.id);
    if (!feed) {
      return res.status(403).json({ error: '无权删除此文章' });
    }

    await Article.delete(req.params.id);
    res.json({ message: '文章删除成功' });
  } catch (error) {
    logger.error('删除文章错误:', { error });
    res.status(500).json({ error: '删除文章失败' });
  }
});

// 获取文章统计信息
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const stats = await Article.getStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    logger.error('获取文章统计错误:', { error });
    res.status(500).json({ error: '获取文章统计失败' });
  }
});

// 批量标记文章为已读
router.put('/batch/read', authenticateToken, async (req, res) => {
  try {
    const { articleIds } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ error: '文章ID列表不能为空' });
    }

    // 验证所有文章都属于当前用户
    for (const articleId of articleIds) {
      const article = await Article.findById(articleId);
      if (article) {
        const feed = await Feed.findById(article.feed_id, req.user.id);
        if (feed) {
          await Article.markAsRead(articleId);
        }
      }
    }

    res.json({ message: '批量标记完成' });
  } catch (error) {
    logger.error('批量标记文章已读错误:', { error });
    res.status(500).json({ error: '批量标记文章已读失败' });
  }
});

module.exports = router;