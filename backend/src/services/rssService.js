const axios = require('axios');
const Article = require('../models/Article');
const Feed = require('../models/Feed');
const Script = require('../models/Script');
const scriptService = require('./scriptService');
const {parseRss} = require("../utils/rssPharse");
const logger = require('../utils/logger');

class RssService {
  // 验证RSS URL是否有效
  async validateRssUrl(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RSS-Service/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error('无法访问RSS源');
      }

      await parseRss(url);
      return true;
    } catch (error) {
      throw new Error(`RSS验证失败: ${error.message}`);
    }
  }

  // 获取单个订阅源的内容
  async fetchFeed(feed) {
    try {
      logger.debug(`开始获取订阅源: ${feed.title} (${feed.url})`);
      
      const articles = await parseRss(feed.url);
      let newArticles = 0;
      let savedArticles = [];

      for (const article of articles) {
        try {

          
          article['feedId'] = feed.id;

          // 保存文章到数据库
          const articleId = await Article.create(article);
          
          if (articleId) {
            // 获取完整的文章对象
            const savedArticle = await Article.findById(articleId);
            if (savedArticle) {
              savedArticles.push(savedArticle);
            }
            
            // 如果是新文章且有关联脚本，执行脚本处理
            if (feed.script_id) {
              try {
                const scriptObj = await Script.findById(feed.script_id);
                
                if (scriptObj && scriptObj.script) {
                  const result = await scriptService.executeScript(scriptObj.script, savedArticle, JSON.parse(savedArticle.raw_json));
                  
                  // 记录脚本执行日志
                  await scriptService.logExecution(feed.id, scriptObj.script, result, null);
                  
                  // 根据脚本结果处理文章
                  if (result.action === 'filter') {
                    await Article.delete(articleId);
                    logger.debug(`文章被脚本过滤: ${savedArticle.title}`);
                    // 从已保存文章列表中移除
                    savedArticles = savedArticles.filter(a => a.id !== articleId);
                  } else if (result.action === 'keep' && result.article) {
                    // 如果脚本修改了文章内容，更新数据库
                    await Article.update(articleId, result.article);
                    await Article.markAsProcessed(articleId);
                  }
                }
              } catch (scriptError) {
                logger.error(`脚本执行错误 (Feed: ${feed.id}):`, { error: scriptError });
                const scriptObj = await Script.findById(feed.script_id);
                await scriptService.logExecution(feed.id, scriptObj ? scriptObj.script : '', null, scriptError.message);
              }
            }
            
            newArticles++;
          }
        } catch (articleError) {
          logger.error(`保存文章错误 (Feed: ${feed.id}):`, { error: articleError });
        }
      }

      // 更新订阅源的最后获取时间
      await Feed.updateLastFetch(feed.id, 'success');
      
      logger.info(`订阅源 ${feed.title} 获取完成，新增 ${newArticles} 篇文章`);
      return { 
        success: true, 
        newArticles,
        articles: savedArticles
      };

    } catch (error) {
      logger.error(`获取订阅源失败 (${feed.title}):`, { error });
      
      // 更新订阅源状态为错误
      await Feed.updateLastFetch(feed.id, 'error', error.message);
      
      return { success: false, error: error.message };
    }
  }

  // 获取所有活跃订阅源的内容
  async fetchAllFeeds() {
    try {
      const activeFeeds = await Feed.getActiveFeeds();
      logger.info(`开始获取 ${activeFeeds.length} 个活跃订阅源`);

      const results = [];
      
      // 并发获取，但限制并发数量
      const concurrency = 5;
      for (let i = 0; i < activeFeeds.length; i += concurrency) {
        const batch = activeFeeds.slice(i, i + concurrency);
        const batchPromises = batch.map(feed => this.fetchFeed(feed));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const feed = batch[index];
          if (result.status === 'fulfilled') {
            results.push({
              feedId: feed.id,
              feedTitle: feed.title,
              ...result.value
            });
          } else {
            results.push({
              feedId: feed.id,
              feedTitle: feed.title,
              success: false,
              error: result.reason.message
            });
          }
        });

        // 批次间稍作延迟，避免过于频繁的请求
        if (i + concurrency < activeFeeds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalArticles = results.reduce((sum, r) => sum + (r.newArticles || 0), 0);
      
      logger.info(`所有订阅源获取完成: ${successCount}/${activeFeeds.length} 成功，共新增 ${totalArticles} 篇文章`);
      
      return {
        total: activeFeeds.length,
        success: successCount,
        failed: activeFeeds.length - successCount,
        totalArticles,
        results
      };

    } catch (error) {
      logger.error('批量获取订阅源失败:', { error });
      throw error;
    }
  }

  // 清理旧文章（保留最近30天的文章）
  async cleanupOldArticles(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const database = require('../utils/database');
      const result = await database.run(
        'DELETE FROM articles WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      logger.info(`清理完成，删除了 ${result.changes} 篇旧文章`);
      return result.changes;
    } catch (error) {
      logger.error('清理旧文章失败:', { error });
      throw error;
    }
  }
}

module.exports = new RssService();