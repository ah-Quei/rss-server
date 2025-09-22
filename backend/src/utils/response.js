/**
 * 统一响应格式工具类
 * 提供标准化的API响应格式
 */

const logger = require('./logger');

class ResponseUtil {
  /**
   * 成功响应
   * @param {Object} res - Express响应对象
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {number} statusCode - HTTP状态码
   * @param {Object} meta - 额外的元数据
   */
  static success(res, data = null, message = '操作成功', statusCode = 200, meta = {}) {
    const response = {
      success: true,
      code: statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...meta
    };

    // 记录成功响应日志
    logger.info(`Response: ${message}`, {
      statusCode,
      url: res.req?.url,
      method: res.req?.method,
      dataType: data ? typeof data : 'null'
    });

    return res.status(statusCode).json(response);
  }

  /**
   * 错误响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {*} error - 错误详情
   * @param {Object} meta - 额外的元数据
   */
  static error(res, message = '操作失败', statusCode = 500, error = null, meta = {}) {
    const response = {
      success: false,
      code: statusCode,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };

    // 只在开发环境下返回错误详情
    if (process.env.NODE_ENV === 'development' && error) {
      response.error = error;
    }

    // 记录错误响应日志
    logger.error(`Error Response: ${message}`, {
      statusCode,
      url: res.req?.url,
      method: res.req?.method,
      error: error?.message || error,
      stack: error?.stack
    });

    return res.status(statusCode).json(response);
  }

  /**
   * 分页响应
   * @param {Object} res - Express响应对象
   * @param {Array} data - 数据列表
   * @param {number} total - 总数
   * @param {number} page - 当前页码
   * @param {number} limit - 每页数量
   * @param {string} message - 响应消息
   * @param {Object} meta - 额外的元数据
   */
  static paginated(res, data, total, page, limit, message = '获取成功', meta = {}) {
    const totalPages = Math.ceil(total / limit);
    
    const response = {
      success: true,
      code: 200,
      message,
      data: {
        items: data,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      timestamp: new Date().toISOString(),
      ...meta
    };

    // 记录分页响应日志
    logger.info(`Paginated Response: ${message}`, {
      total,
      page,
      limit,
      totalPages,
      itemCount: data.length
    });

    return res.status(200).json(response);
  }

  /**
   * 验证错误响应
   * @param {Object} res - Express响应对象
   * @param {Array} errors - 验证错误数组
   * @param {Object} meta - 额外的元数据
   */
  static validationError(res, errors, meta = {}) {
    const response = {
      success: false,
      code: 400,
      message: '输入验证失败',
      errors,
      timestamp: new Date().toISOString(),
      ...meta
    };

    // 记录验证错误日志
    logger.warn('Validation Error Response', {
      errorCount: errors.length,
      errors: errors.map(e => ({ field: e.field, message: e.message }))
    });

    return res.status(400).json(response);
  }

  /**
   * 创建响应
   * @param {Object} res - Express响应对象
   * @param {number} statusCode - HTTP状态码
   * @param {boolean} success - 是否成功
   * @param {string} message - 响应消息
   * @param {*} data - 响应数据
   * @param {Object} meta - 额外的元数据
   */
  static create(res, statusCode, success, message, data = null, meta = {}) {
    const response = {
      success,
      code: statusCode,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (data !== null) {
      response.data = data;
    }

    // 记录响应日志
    const logLevel = success ? 'info' : 'error';
    logger[logLevel](`Custom Response: ${message}`, {
      statusCode,
      success,
      dataType: data ? typeof data : 'null'
    });

    return res.status(statusCode).json(response);
  }

  /**
   * 批量操作响应
   * @param {Object} res - Express响应对象
   * @param {number} total - 总数
   * @param {number} success - 成功数
   * @param {number} failed - 失败数
   * @param {Array} errors - 错误列表
   * @param {string} message - 响应消息
   */
  static batch(res, total, success, failed, errors = [], message = '批量操作完成') {
    return this.success(res, {
      total,
      success,
      failed,
      errors
    }, message, 200, {
      batchOperation: true
    });
  }

  /**
   * 未授权响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static unauthorized(res, message = '未授权访问') {
    return res.status(401).json({
      success: false,
      code: 401,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 禁止访问响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static forbidden(res, message = '禁止访问') {
    return res.status(403).json({
      success: false,
      code: 403,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 资源未找到响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static notFound(res, message = '资源未找到') {
    return res.status(404).json({
      success: false,
      code: 404,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 服务器内部错误响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   * @param {*} error - 错误详情
   */
  static internalError(res, message = '服务器内部错误', error = null) {
    return this.error(res, message, 500, error);
  }
}

module.exports = ResponseUtil;