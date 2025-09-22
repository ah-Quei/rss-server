const express = require('express');
const router = express.Router();
const cronService = require('../services/cronService');
const { authenticateToken } = require('../middleware/auth');

// 获取定时任务状态
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = cronService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    res.status(500).json({ error: '获取定时任务状态失败' });
  }
});

// 手动执行RSS获取任务
router.post('/run-fetch', authenticateToken, async (req, res) => {
  try {
    const result = await cronService.runFetchTask();
    res.json({ success: true, message: '手动RSS获取任务执行成功', result });
  } catch (error) {
    console.error('手动执行RSS获取任务失败:', error);
    res.status(500).json({ error: '手动执行RSS获取任务失败' });
  }
});

// 手动执行清理任务
router.post('/run-cleanup', authenticateToken, async (req, res) => {
  try {
    const result = await cronService.runCleanupTask();
    res.json({ success: true, message: '手动清理任务执行成功', result });
  } catch (error) {
    console.error('手动执行清理任务失败:', error);
    res.status(500).json({ error: '手动执行清理任务失败' });
  }
});

module.exports = router;