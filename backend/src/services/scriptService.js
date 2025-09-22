const { VM } = require('vm2');
const axios = require('axios');
const database = require('../utils/database');
const OpenAI = require('openai');
const crypto = require('crypto');

class ScriptService {
  constructor() {
    this.vmOptions = {
      timeout: 5000, // 5秒超时
      sandbox: {
        console: {
          log: (...args) => console.log('[Script]', ...args),
          error: (...args) => console.error('[Script]', ...args),
          warn: (...args) => console.warn('[Script]', ...args)
        },
        // 提供webhook功能
        webhook: this.createWebhookFunction(),
        // 提供HTTP请求功能
        http: this.createHttpFunction(),
        // 提供日期处理功能
        Date: Date,
        // 提供JSON处理功能
        JSON: JSON,
        // 提供字符串和数组方法
        String: String,
        Array: Array,
        Object: Object,
        Math: Math,
        parseInt: parseInt,
        parseFloat: parseFloat,
        // 提供OpenAI API
        openai: this.createOpenAIFunction(),
        // 提供加密功能
        crypto: this.createCryptoFunction(),
        // 提供正则表达式
        RegExp: RegExp,
        // 提供URL处理
        URL: URL,
        // 提供Buffer处理（受限）
        Buffer: {
          from: Buffer.from.bind(Buffer),
          isBuffer: Buffer.isBuffer.bind(Buffer)
        }
      }
    };
  }

  // 创建安全的webhook函数
  createWebhookFunction() {
    return async (url, data, options = {}) => {
      try {
        const config = {
          method: options.method || 'POST',
          url: url,
          data: data,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'RSS-Service-Webhook/1.0',
            ...options.headers
          },
          timeout: options.timeout || 10000
        };

        const response = await axios(config);
        return {
          success: true,
          status: response.status,
          data: response.data
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          status: error.response?.status
        };
      }
    };
  }

  // 创建安全的HTTP请求函数
  createHttpFunction() {
    return {
      get: async (url, options = {}) => {
        try {
          const response = await axios.get(url, {
            timeout: options.timeout || 10000,
            headers: options.headers || {}
          });
          return {
            success: true,
            status: response.status,
            data: response.data
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            status: error.response?.status
          };
        }
      },
      post: async (url, data, options = {}) => {
        try {
          const response = await axios.post(url, data, {
            timeout: options.timeout || 10000,
            headers: options.headers || {}
          });
          return {
            success: true,
            status: response.status,
            data: response.data
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            status: error.response?.status
          };
        }
      }
    };
  }

  // 创建OpenAI API函数
  createOpenAIFunction() {
    return {
      // 创建OpenAI客户端实例
      createClient: (apiKey, options = {}) => {
        if (!apiKey) {
          throw new Error('OpenAI API密钥不能为空');
        }
        
        const client = new OpenAI({
          apiKey: apiKey,
          ...options
        });
        
        return {
          // 聊天完成API
          chat: {
            completions: {
              create: async (params) => {
                try {
                  const response = await client.chat.completions.create({
                    model: params.model || 'gpt-3.5-turbo',
                    messages: params.messages,
                    max_tokens: Math.min(params.max_tokens || 1000, 2000), // 限制最大token数
                    temperature: params.temperature || 0.7,
                    ...params
                  });
                  return response;
                } catch (error) {
                  throw new Error(`OpenAI API调用失败: ${error.message}`);
                }
              }
            }
          },
          // 文本嵌入API
          embeddings: {
            create: async (params) => {
              try {
                const response = await client.embeddings.create({
                  model: params.model || 'text-embedding-ada-002',
                  input: params.input,
                  ...params
                });
                return response;
              } catch (error) {
                throw new Error(`OpenAI Embeddings API调用失败: ${error.message}`);
              }
            }
          }
        };
      }
    };
  }

  // 创建加密功能函数
  createCryptoFunction() {
    return {
      // MD5哈希
      md5: (text) => {
        return crypto.createHash('md5').update(text).digest('hex');
      },
      // SHA256哈希
      sha256: (text) => {
        return crypto.createHash('sha256').update(text).digest('hex');
      },
      // Base64编码
      base64Encode: (text) => {
        return Buffer.from(text, 'utf8').toString('base64');
      },
      // Base64解码
      base64Decode: (base64) => {
        return Buffer.from(base64, 'base64').toString('utf8');
      },
      // 生成随机字符串
      randomString: (length = 16) => {
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
      },
      // HMAC签名
      hmac: (algorithm, key, data) => {
        const validAlgorithms = ['sha1', 'sha256', 'sha512'];
        if (!validAlgorithms.includes(algorithm)) {
          throw new Error(`不支持的HMAC算法: ${algorithm}`);
        }
        return crypto.createHmac(algorithm, key).update(data).digest('hex');
      }
    };
  }

  // 执行用户脚本
  async executeScript(scriptCode, article, rawItem = null) {
    try {
      // 创建VM实例
      const vm = new VM(this.vmOptions);

      // 准备脚本环境
      const wrappedScript = `
        ${scriptCode}
        
        // 确保有processArticle函数
        if (typeof processArticle !== 'function') {
          throw new Error('脚本必须包含processArticle函数');
        }
        
        // 执行处理函数
        processArticle(article);
      `;

      // 设置文章数据到沙箱
      vm.sandbox.article = {
        id: article.id,
        title: article.title,
        link: article.link,
        description: article.description,
        content: article.content,
        pub_date: article.pub_date,
        guid: article.guid,
        feed_id: article.feed_id
      };
      
      // 设置原始XML解析对象到沙箱（如果提供）
      if (rawItem) {
        vm.sandbox.rawItem = rawItem;
      }

      // 执行脚本
      const result = await vm.run(wrappedScript);

      // 验证返回结果格式
      if (!result || typeof result !== 'object') {
        throw new Error('脚本必须返回一个对象');
      }

      if (!result.action || !['keep', 'filter'].includes(result.action)) {
        throw new Error('脚本返回的action必须是"keep"或"filter"');
      }

      return result;

    } catch (error) {
      console.error('脚本执行错误:', error);
      throw new Error(`脚本执行失败: ${error.message}`);
    }
  }

  // 记录脚本执行日志
  async logExecution(feedId, scriptContent, result, errorMessage) {
    try {
      await database.run(
        'INSERT INTO script_logs (feed_id, script_content, execution_result, error_message) VALUES (?, ?, ?, ?)',
        [
          feedId,
          scriptContent.substring(0, 1000), // 限制脚本内容长度
          result ? JSON.stringify(result) : null,
          errorMessage
        ]
      );
    } catch (error) {
      console.error('记录脚本日志失败:', error);
    }
  }

  // 获取脚本执行日志
  async getExecutionLogs(feedId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const logs = await database.all(
        'SELECT * FROM script_logs WHERE feed_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [feedId, limit, offset]
      );

      return logs.map(log => ({
        id: log.id,
        feedId: log.feed_id,
        scriptContent: log.script_content,
        executionResult: log.execution_result ? JSON.parse(log.execution_result) : null,
        errorMessage: log.error_message,
        createdAt: log.created_at
      }));
    } catch (error) {
      console.error('获取脚本日志失败:', error);
      throw error;
    }
  }

  // 清理旧的脚本日志
  async cleanupOldLogs(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await database.run(
        'DELETE FROM script_logs WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      console.log(`清理完成，删除了 ${result.changes} 条脚本日志`);
      return result.changes;
    } catch (error) {
      console.error('清理脚本日志失败:', error);
      throw error;
    }
  }

  // 验证脚本语法
  validateScript(scriptCode) {
    try {
      // 基本语法检查
      new Function(scriptCode);
      
      // 检查是否包含processArticle函数
      if (!scriptCode.includes('function processArticle')) {
        throw new Error('脚本必须包含processArticle函数');
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }
}

module.exports = new ScriptService();