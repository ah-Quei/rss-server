const cron = require('node-cron');
const rssService = require('./rssService');
const scriptService = require('./scriptService');
const Feed = require('../models/Feed');
const database = require('../utils/database');
const logger = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.feedJobs = new Map();
    this.isRunning = false;
  }

  // 启动定时任务
  async start() {
    if (this.isRunning) {
      logger.info('定时任务已在运行中');
      return;
    }

    logger.info('启动RSS定时任务服务');

    // 初始化所有订阅源的定时任务
    await this.initializeFeedJobs();

    // 每小时检查一次是否有新的订阅源或更新的刷新间隔
    const checkFeedsJob = cron.schedule('0 * * * *', async () => {
      logger.debug('检查订阅源更新');
      try {
        await this.updateFeedJobs();
      } catch (error) {
        logger.error('检查订阅源更新失败:', { error });
      }
    }, {
      scheduled: false
    });

    // 每天凌晨2点清理旧数据
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      logger.info('开始清理旧数据');
      try {
        // 清理30天前的文章
        await rssService.cleanupOldArticles(30);
        
        // 清理7天前的脚本日志
        await scriptService.cleanupOldLogs(7);
        
        logger.info('旧数据清理完成');
      } catch (error) {
        logger.error('清理旧数据失败:', { error });
      }
    }, {
      scheduled: false
    });

    // 启动任务
    checkFeedsJob.start();
    cleanupJob.start();

    this.jobs.set('checkFeeds', checkFeedsJob);
    this.jobs.set('cleanup', cleanupJob);
    this.isRunning = true;

    logger.info('定时任务启动成功');
    logger.debug('- 订阅源检查任务: 每小时执行一次');
    logger.debug('- 数据清理任务: 每天凌晨2点执行');
  }
  
  // 初始化所有订阅源的定时任务
  async initializeFeedJobs() {
    try {
      logger.info('初始化订阅源定时任务');
      // 获取所有活跃的订阅源
      const feeds = await database.all('SELECT * FROM feeds WHERE status = ?', ['active']);
      
      for (const feed of feeds) {
        this.createFeedJob(feed);
      }
      
      logger.info(`已为 ${feeds.length} 个订阅源创建定时任务`);
    } catch (error) {
      logger.error('初始化订阅源定时任务失败:', { error });
    }
  }
  
  // 更新订阅源定时任务
  async updateFeedJobs() {
    try {
      // 获取所有活跃的订阅源
      const feeds = await database.all('SELECT * FROM feeds WHERE status = ?', ['active']);
      const currentFeedIds = new Set(feeds.map(feed => feed.id.toString()));
      
      // 移除已不存在或不活跃的订阅源任务
      for (const [feedId, jobInfo] of this.feedJobs.entries()) {
        if (!currentFeedIds.has(feedId)) {
          if (jobInfo && jobInfo.job && typeof jobInfo.job.stop === 'function') {
            jobInfo.job.stop();
          }
          this.feedJobs.delete(feedId);
          logger.info(`已移除订阅源 ${feedId} 的定时任务`);
        }
      }
      
      // 添加新的订阅源任务或更新现有的
      for (const feed of feeds) {
        const feedId = feed.id.toString();
        const existingJob = this.feedJobs.get(feedId);
        
        // 如果订阅源不存在任务或刷新间隔已更改，则创建新任务
        if (!existingJob || existingJob.refreshInterval !== feed.refresh_interval) {
          if (existingJob && existingJob.job && typeof existingJob.job.stop === 'function') {
            existingJob.job.stop();
          }
          this.createFeedJob(feed);
        }
      }
    } catch (error) {
      logger.error('更新订阅源定时任务失败:', { error });
    }
  }
  
  // 为单个订阅源创建定时任务
  createFeedJob(feed) {
    const feedId = feed.id.toString();
    const refreshInterval = feed.refresh_interval || 60; // 默认60分钟
    
    // 创建cron表达式，根据刷新间隔设置
    // 如果间隔小于60分钟，则按分钟设置；否则按小时设置
    let cronExpression;
    if (refreshInterval < 60) {
      cronExpression = `*/${refreshInterval} * * * *`; // 每x分钟
    } else {
      const hours = Math.floor(refreshInterval / 60);
      cronExpression = `0 */${hours} * * *`; // 每x小时
    }
    
    logger.debug(`为订阅源 ${feed.title} (ID: ${feedId}) 创建定时任务，刷新间隔: ${refreshInterval}分钟，Cron: ${cronExpression}`);
    
    const job = cron.schedule(cronExpression, async () => {
      logger.debug(`开始获取订阅源: ${feed.title} (ID: ${feedId})`);
      try {
        const result = await rssService.fetchFeed(feed);
        logger.info(`订阅源 ${feed.title} (ID: ${feedId}) 获取完成，新增 ${result?.newArticles || 0} 篇文章`);
      } catch (error) {
        logger.error(`订阅源 ${feed.title} (ID: ${feedId}) 获取失败:`, { error });
      }
    });
    
    this.feedJobs.set(feedId, {
      job: job,
      refreshInterval: refreshInterval
    });
  }

  // 停止定时任务
  stop() {
    if (!this.isRunning) {
      logger.info('定时任务未在运行');
      return;
    }

    logger.info('停止定时任务服务');

    // 停止全局任务
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.debug(`- ${name} 任务已停止`);
    });
    this.jobs.clear();
    
    // 停止所有订阅源任务
    let feedCount = 0;
    this.feedJobs.forEach((jobInfo, feedId) => {
      jobInfo.job.stop();
      feedCount++;
    });
    logger.debug(`- ${feedCount} 个订阅源任务已停止`);
    this.feedJobs.clear();
    
    this.isRunning = false;

    logger.info('定时任务停止完成');
  }

  // 手动执行RSS获取任务
  async runFetchTask() {
    logger.info('手动执行RSS获取任务');
    try {
      // 获取所有活跃的订阅源
      const feeds = await database.all('SELECT * FROM feeds WHERE status = ?', ['active']);
      logger.info(`开始获取 ${feeds.length} 个订阅源的内容`);
      
      const results = [];
      for (const feed of feeds) {
        try {
          const result = await rssService.fetchFeed(feed);
          results.push({
            feedId: feed.id,
            title: feed.title,
            success: true,
            newArticles: result?.newArticles || 0
          });
        } catch (error) {
          logger.error(`订阅源 ${feed.title} (ID: ${feed.id}) 获取失败:`, { error });
          results.push({
            feedId: feed.id,
            title: feed.title,
            success: false,
            error: error.message
          });
        }
      }
      
      logger.info('手动RSS获取任务完成');
      return {
        totalFeeds: feeds.length,
        results: results
      };
    } catch (error) {
      logger.error('手动RSS获取任务失败:', { error });
      throw error;
    }
  }

  // 手动执行清理任务
  async runCleanupTask() {
    logger.info('手动执行清理任务');
    try {
      const articleCount = await rssService.cleanupOldArticles(30);
      const logCount = await scriptService.cleanupOldLogs(7);
      
      const result = {
        cleanedArticles: articleCount,
        cleanedLogs: logCount
      };
      
      logger.info('手动清理任务完成', result);
      return result;
    } catch (error) {
      logger.error('手动清理任务失败:', { error });
      throw error;
    }
  }

  // 获取任务状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      nextRun: {
        fetch: this.isRunning ? '每30分钟' : '未运行',
        cleanup: this.isRunning ? '每天凌晨2点' : '未运行'
      }
    };
  }

  // 更新任务调度（可以根据需要动态调整）
  updateSchedule(taskName, cronExpression) {
    if (!this.jobs.has(taskName)) {
      throw new Error(`任务 ${taskName} 不存在`);
    }

    // 停止现有任务
    this.jobs.get(taskName).stop();

    // 创建新的任务调度
    let newJob;
    if (taskName === 'fetch') {
      newJob = cron.schedule(cronExpression, async () => {
        try {
          await rssService.fetchAllFeeds();
        } catch (error) {
          logger.error('定时获取RSS内容失败:', { error });
        }
      });
    } else if (taskName === 'cleanup') {
      newJob = cron.schedule(cronExpression, async () => {
        try {
          await rssService.cleanupOldArticles(30);
          await scriptService.cleanupOldLogs(7);
        } catch (error) {
          logger.error('清理旧数据失败:', { error });
        }
      });
    }

    if (newJob) {
      newJob.start();
      this.jobs.set(taskName, newJob);
      logger.info(`任务 ${taskName} 调度已更新为: ${cronExpression}`);
    }
  }
}

module.exports = new CronService();