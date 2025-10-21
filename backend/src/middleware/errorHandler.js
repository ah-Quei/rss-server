/**
 * 统一错误处理中间件
 * 提供标准化的错误处理和响应格式
 */

const logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

/**
 * 认证错误类
 */
class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 授权错误类
 */
class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 资源未找到错误类
 */
class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 数据库错误类
 */
class DatabaseError extends AppError {
  constructor(message = '数据库操作失败', originalError = null) {
    super(message, 500);
    this.originalError = originalError;
    this.name = 'DatabaseError';
  }
}

/**
 * 外部服务错误类
 */
class ExternalServiceError extends AppError {
  constructor(message = '外部服务调用失败', statusCode = 502) {
    super(message, statusCode);
    this.name = 'ExternalServiceError';
  }
}

/**
 * 处理数据库错误
 */
const handleDatabaseError = (error) => {
  logger.error('Database error occurred', {
    message: error.message,
    code: error.code,
    errno: error.errno,
    stack: error.stack
  });

  // SQLite 错误处理
  if (error.code) {
    switch (error.code) {
      case 'SQLITE_CONSTRAINT_UNIQUE':
        return new ValidationError('数据已存在，请检查唯一性约束');
      case 'SQLITE_CONSTRAINT_FOREIGN_KEY':
        return new ValidationError('外键约束失败，请检查关联数据');
      case 'SQLITE_CONSTRAINT_NOT_NULL':
        return new ValidationError('必填字段不能为空');
      case 'SQLITE_BUSY':
        return new DatabaseError('数据库繁忙，请稍后重试');
      default:
        return new DatabaseError('数据库操作失败', error);
    }
  }

  return new DatabaseError('数据库操作失败', error);
};

/**
 * 处理验证错误
 */
const handleValidationError = (error) => {
  logger.warn('Validation error occurred', {
    message: error.message,
    errors: error.errors
  });

  return error;
};

/**
 * 处理JWT错误
 */
const handleJWTError = (error) => {
  logger.warn('JWT error occurred', {
    message: error.message,
    name: error.name
  });

  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('无效的访问令牌');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('访问令牌已过期');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('访问令牌尚未生效');
  }

  return new AuthenticationError('令牌验证失败');
};

/**
 * 处理Axios错误
 */
const handleAxiosError = (error) => {
  logger.error('External service error occurred', {
    message: error.message,
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    statusText: error.response?.statusText
  });

  const status = error.response?.status || 502;
  const message = error.response?.data?.message || '外部服务调用失败';
  
  return new ExternalServiceError(message, status);
};

/**
 * 错误处理中间件
 */
const errorHandler = (error, req, res, next) => {
  let processedError = error;

  // 如果不是自定义错误，则进行错误转换
  if (!(error instanceof AppError)) {
    // 数据库错误
    if (error.code && error.code.startsWith('SQLITE_')) {
      processedError = handleDatabaseError(error);
    }
    // JWT错误
    else if (error.name && error.name.includes('JsonWebToken')) {
      processedError = handleJWTError(error);
    }
    // Axios错误
    else if (error.isAxiosError) {
      processedError = handleAxiosError(error);
    }
    // 验证错误
    else if (error instanceof ValidationError) {
      processedError = handleValidationError(error);
    }
    // 其他未知错误
    else {
      logger.error('Unhandled error occurred', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      processedError = new AppError('服务器内部错误', 500, false);
    }
  }

  // 记录错误日志
  const logLevel = processedError.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Error handled by middleware', {
    message: processedError.message,
    statusCode: processedError.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    stack: processedError.stack,
    isOperational: processedError.isOperational
  });

  // 根据错误类型返回相应的响应
  if (processedError instanceof ValidationError) {
    return ResponseUtil.validationError(res, processedError.errors || [
      { field: 'general', message: processedError.message }
    ]);
  }

  if (processedError instanceof AuthenticationError) {
    return ResponseUtil.unauthorized(res, processedError.message);
  }

  if (processedError instanceof AuthorizationError) {
    return ResponseUtil.error(res, processedError.message, 403);
  }

  if (processedError instanceof NotFoundError) {
    return ResponseUtil.notFound(res, processedError.message);
  }

  // 其他错误使用通用错误响应
  return ResponseUtil.error(
    res,
    processedError.message,
    processedError.statusCode,
    processedError.isOperational ? null : processedError
  );
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`路由 ${req.originalUrl} 不存在`);
  next(error);
};

/**
 * 异步错误捕获包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 进程异常处理
 */
function setupProcessHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise?.toString?.()
    });
    // 不再强制退出；保留服务以便继续运行并人工排查
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupProcessHandlers,
  // 错误类导出
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError
};