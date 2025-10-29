const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDir();

    // 新增：日志等级与开关
    this.levelOrder = { debug: 10, info: 20, warn: 30, error: 40 };
    const defaultLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
    this.level = (process.env.LOG_LEVEL || defaultLevel).toLowerCase();
    if (!this.levelOrder[this.level]) this.level = 'info';
    this.threshold = this.levelOrder[this.level];

    this.enableFile = process.env.LOG_ENABLE_FILE !== 'false'; // 默认开启
    this.enableAllLog = process.env.LOG_ENABLE_ALL_LOG === 'true'; // 默认不写 all.log
    this.enableDbLogs = process.env.LOG_ENABLE_DB_LOGS === 'true' || process.env.NODE_ENV !== 'production';
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

  // 新增：判断是否记录该等级
  shouldLog(level) {
    const val = this.levelOrder[level] || this.levelOrder.info;
    return val >= this.threshold;
  }

  writeToFile(level, formattedMessage) {
    if (!this.enableFile) return;
    const logFile = path.join(this.logDir, `${level}.log`);
    fs.appendFileSync(logFile, formattedMessage + '\n');

    if (this.enableAllLog) {
      const allLogFile = path.join(this.logDir, 'all.log');
      fs.appendFileSync(allLogFile, formattedMessage + '\n');
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    // 控制台输出（受等级阈值控制）
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
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // 写入文件（受等级与开关控制）
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

  // 记录HTTP请求（调整4xx为warn，5xx为error）
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    };
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `HTTP ${req.method} ${req.url}`, meta);
  }

  // 记录数据库操作（降级为debug，增加开关）
  logDatabase(operation, table, meta = {}) {
    if (!this.enableDbLogs) return;
    this.debug(`Database ${operation} on ${table}`, meta);
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