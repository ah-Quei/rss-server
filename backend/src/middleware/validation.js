const { body, param, query, validationResult } = require('express-validator');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 验证结果处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    // 记录验证错误日志
    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
      ip: req.ip
    });
    
    return ResponseUtil.validationError(res, errorMessages);
  }
  next();
};

/**
 * 用户注册验证规则
 */
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  
  handleValidationErrors
];

/**
 * 用户登录验证规则
 */
const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  
  handleValidationErrors
];

/**
 * RSS订阅源验证规则
 */
const validateFeedCreation = [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('请输入有效的RSS URL'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('标题长度不能超过200个字符'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500个字符'),
  
  handleValidationErrors
];

/**
 * 脚本创建验证规则
 */
const validateScriptCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('脚本名称长度必须在1-100个字符之间'),
  
  body('code')
    .notEmpty()
    .withMessage('脚本代码不能为空')
    .isLength({ max: 10000 })
    .withMessage('脚本代码长度不能超过10000个字符'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500个字符'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic必须是布尔值'),
  
  handleValidationErrors
];

/**
 * 脚本更新验证规则
 */
const validateScriptUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('脚本ID必须是正整数'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('脚本名称长度必须在1-100个字符之间'),
  
  body('code')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('脚本代码长度不能超过10000个字符'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500个字符'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic必须是布尔值'),
  
  handleValidationErrors
];

/**
 * 分页参数验证规则
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
    .toInt(),
  
  handleValidationErrors
];

/**
 * ID参数验证规则
 */
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
    .toInt(),
  
  handleValidationErrors
];

/**
 * 文章状态更新验证规则
 */
const validateArticleStatusUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('文章ID必须是正整数')
    .toInt(),
  
  body('read')
    .optional()
    .isBoolean()
    .withMessage('read必须是布尔值'),
  
  body('processed')
    .optional()
    .isBoolean()
    .withMessage('processed必须是布尔值'),
  
  handleValidationErrors
];

/**
 * URL验证规则
 */
const validateUrl = [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('请输入有效的URL'),
  
  handleValidationErrors
];

/**
 * 搜索参数验证规则
 */
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100个字符之间'),
  
  query('feedId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('订阅源ID必须是正整数')
    .toInt(),
  
  query('read')
    .optional()
    .isBoolean()
    .withMessage('read必须是布尔值')
    .toBoolean(),
  
  handleValidationErrors
];

/**
 * 通用字符串长度验证
 * @param {string} field - 字段名
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateStringLength = (field, min = 1, max = 255, required = true) => {
  const validator = body(field).trim();
  
  if (required) {
    validator.notEmpty().withMessage(`${field}不能为空`);
  } else {
    validator.optional();
  }
  
  return validator.isLength({ min, max }).withMessage(`${field}长度必须在${min}-${max}个字符之间`);
};

/**
 * 通用数字验证
 * @param {string} field - 字段名
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateNumber = (field, min = 0, max = Number.MAX_SAFE_INTEGER, required = true) => {
  const validator = body(field);
  
  if (!required) {
    validator.optional();
  }
  
  return validator.isInt({ min, max }).withMessage(`${field}必须是${min}-${max}之间的整数`).toInt();
};

/**
 * 通用邮箱验证
 * @param {string} field - 字段名
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateEmail = (field = 'email', required = true) => {
  const validator = body(field);
  
  if (!required) {
    validator.optional();
  }
  
  return validator.isEmail().withMessage('请输入有效的邮箱地址').normalizeEmail();
};

/**
 * 通用URL验证
 * @param {string} field - 字段名
 * @param {Array} protocols - 允许的协议
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateUrlField = (field = 'url', protocols = ['http', 'https'], required = true) => {
  const validator = body(field);
  
  if (!required) {
    validator.optional();
  }
  
  return validator.isURL({ protocols }).withMessage('请输入有效的URL');
};

/**
 * 通用布尔值验证
 * @param {string} field - 字段名
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateBoolean = (field, required = false) => {
  const validator = body(field);
  
  if (!required) {
    validator.optional();
  }
  
  return validator.isBoolean().withMessage(`${field}必须是布尔值`).toBoolean();
};

/**
 * 通用日期验证
 * @param {string} field - 字段名
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateDate = (field, required = false) => {
  const validator = body(field);
  
  if (!required) {
    validator.optional();
  }
  
  return validator.isISO8601().withMessage(`${field}必须是有效的日期格式`).toDate();
};

/**
 * 通用数组验证
 * @param {string} field - 字段名
 * @param {number} minLength - 最小长度
 * @param {number} maxLength - 最大长度
 * @param {boolean} required - 是否必填
 * @returns {Array} 验证规则数组
 */
const validateArray = (field, minLength = 0, maxLength = 100, required = false) => {
  const validator = body(field);
  
  if (!required) {
    validator.optional();
  }
  
  return validator.isArray({ min: minLength, max: maxLength })
    .withMessage(`${field}必须是包含${minLength}-${maxLength}个元素的数组`);
};

/**
 * SQL注入防护验证
 * @param {string} field - 字段名
 * @returns {Array} 验证规则数组
 */
const validateSqlSafe = (field) => {
  return body(field).custom((value) => {
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i;
    if (sqlInjectionPattern.test(value)) {
      throw new Error(`${field}包含不安全的内容`);
    }
    return true;
  });
};

/**
 * XSS防护验证
 * @param {string} field - 字段名
 * @returns {Array} 验证规则数组
 */
const validateXssSafe = (field) => {
  return body(field).custom((value) => {
    const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    if (xssPattern.test(value)) {
      throw new Error(`${field}包含不安全的脚本内容`);
    }
    return true;
  });
};

/**
 * 文件类型验证
 * @param {string} field - 字段名
 * @param {Array} allowedTypes - 允许的文件类型
 * @returns {Array} 验证规则数组
 */
const validateFileType = (field, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  return body(field).custom((value, { req }) => {
    if (req.file && !allowedTypes.includes(req.file.mimetype)) {
      throw new Error(`${field}文件类型不支持，仅支持: ${allowedTypes.join(', ')}`);
    }
    return true;
  });
};

/**
 * 密码强度验证
 * @param {string} field - 字段名
 * @param {Object} options - 验证选项
 * @returns {Array} 验证规则数组
 */
const validatePasswordStrength = (field = 'password', options = {}) => {
  const {
    minLength = 8,
    maxLength = 128,
    requireLowercase = true,
    requireUppercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;

  let pattern = '^';
  if (requireLowercase) pattern += '(?=.*[a-z])';
  if (requireUppercase) pattern += '(?=.*[A-Z])';
  if (requireNumbers) pattern += '(?=.*\\d)';
  if (requireSpecialChars) pattern += '(?=.*[!@#$%^&*])';
  pattern += '.+$';

  return body(field)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`密码长度必须在${minLength}-${maxLength}个字符之间`)
    .matches(new RegExp(pattern))
    .withMessage('密码强度不足，请包含大小写字母和数字');
};

/**
 * 安全性验证 - 防止XSS和SQL注入
 */
const sanitizeInput = [
  body('*')
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        // 移除潜在的恶意脚本标签
        return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
      return value;
    }),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateFeedCreation,
  validateScriptCreation,
  validateScriptUpdate,
  validatePagination,
  validateId,
  validateArticleStatusUpdate,
  validateUrl,
  validateSearch,
  validateStringLength,
  validateNumber,
  validateEmail,
  validateUrlField,
  validateBoolean,
  validateDate,
  validateArray,
  validateSqlSafe,
  validateXssSafe,
  validateFileType,
  validatePasswordStrength,
  sanitizeInput
};