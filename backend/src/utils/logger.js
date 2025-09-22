const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  writeToFile(level, formattedMessage) {
    const logFile = path.join(this.logDir, `${level}.log`);
    const allLogFile = path.join(this.logDir, 'all.log');
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
    fs.appendFileSync(allLogFile, formattedMessage + '\n');
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // 控制台输出
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }

    // 写入文件
    this.writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // 记录HTTP请求
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    };
    
    const level = res.statusCode >= 400 ? 'error' : 'info';
    this.log(level, `HTTP ${req.method} ${req.url}`, meta);
  }

  // 记录数据库操作
  logDatabase(operation, table, meta = {}) {
    this.info(`Database ${operation} on ${table}`, meta);
  }

  // 记录脚本执行
  logScript(scriptId, action, meta = {}) {
    this.info(`Script ${scriptId} ${action}`, meta);
  }

  // 记录定时任务
  logCron(taskName, action, meta = {}) {
    this.info(`Cron task ${taskName} ${action}`, meta);
  }
}

// 创建单例实例
const logger = new Logger();

module.exports = logger;