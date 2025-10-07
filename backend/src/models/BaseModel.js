const database = require('../utils/database');
const logger = require('../utils/logger');

class BaseModel {
  // 获取表名 - 子类需要重写
  static get tableName() {
    throw new Error('tableName must be defined in subclass');
  }

  // 获取可填充字段 - 子类需要重写
  static get fillableFields() {
    throw new Error('fillableFields must be defined in subclass');
  }

  // 通用查询方法
  static async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await database.get(sql, [id]);
      logger.logDatabase('SELECT', this.tableName, { id });
      return result;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by id ${id}`, { error: error.message });
      throw error;
    }
  }

  // 查找单条记录
  static async findOne(conditions = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params = [];

      // 添加条件
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      sql += ' LIMIT 1';

      const result = await database.get(sql, params);
      logger.logDatabase('SELECT_ONE', this.tableName, { conditions });
      return result;
    } catch (error) {
      logger.error(`Error finding one ${this.tableName}`, { error: error.message, conditions });
      throw error;
    }
  }

  // 查找所有记录
  static async findAll(conditions = {}, orderBy = 'id DESC', limit = null) {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params = [];

      // 添加条件
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      // 添加排序
      if (orderBy) {
        sql += ` ORDER BY ${orderBy}`;
      }

      // 添加限制
      if (limit) {
        sql += ` LIMIT ?`;
        params.push(limit);
      }

      const results = await database.all(sql, params);
      logger.logDatabase('SELECT', this.tableName, { conditions, orderBy, limit, count: results.length });
      return results;
    } catch (error) {
      logger.error(`Error finding all ${this.tableName}`, { error: error.message, conditions });
      throw error;
    }
  }

  // 分页查询
  static async findWithPagination(page = 1, pageSize = 10, conditions = {}, orderBy = 'id DESC') {
    try {
      const offset = (page - 1) * pageSize;
      
      // 获取总数
      let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const countParams = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        countSql += ` WHERE ${whereClause}`;
        countParams.push(...Object.values(conditions));
      }
      
      const countResult = await database.get(countSql, countParams);
      const total = countResult.total;

      // 获取数据
      let sql = `SELECT * FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);

      const data = await database.all(sql, params);
      
      const result = {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };

      logger.logDatabase('SELECT_PAGINATED', this.tableName, { page, pageSize, total });
      return result;
    } catch (error) {
      logger.error(`Error finding paginated ${this.tableName}`, { error: error.message, page, pageSize });
      throw error;
    }
  }

  // 创建记录
  static async create(data) {
    try {
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
      
      const result = await database.run(sql, Object.values(data));
      logger.logDatabase('INSERT', this.tableName, { id: result.id });
      
      return result.id;
    } catch (error) {
      logger.error(`Error creating ${this.tableName}`, { error: error.message, data });
      throw error;
    }
  }

  // 更新记录
  static async update(id, data) {
    try {
      const fields = Object.keys(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      
      const params = [...Object.values(data), id];
      const result = await database.run(sql, params);
      
      logger.logDatabase('UPDATE', this.tableName, { id, changes: result.changes });
      return result.changes > 0;
    } catch (error) {
      logger.error(`Error updating ${this.tableName} with id ${id}`, { error: error.message, data });
      throw error;
    }
  }

  // 删除记录
  static async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await database.run(sql, [id]);
      
      logger.logDatabase('DELETE', this.tableName, { id, changes: result.changes });
      return result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting ${this.tableName} with id ${id}`, { error: error.message });
      throw error;
    }
  }

  // 批量删除
  static async deleteMany(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return 0;
      }
      
      const placeholders = ids.map(() => '?').join(', ');
      const sql = `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`;
      const result = await database.run(sql, ids);
      
      logger.logDatabase('DELETE_MANY', this.tableName, { ids, changes: result.changes });
      return result.changes;
    } catch (error) {
      logger.error(`Error deleting multiple ${this.tableName}`, { error: error.message, ids });
      throw error;
    }
  }

  // 检查记录是否存在
  static async exists(id) {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = await database.get(sql, [id]);
      return !!result;
    } catch (error) {
      logger.error(`Error checking existence of ${this.tableName} with id ${id}`, { error: error.message });
      throw error;
    }
  }

  // 统计记录数量
  static async count(conditions = {}) {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      const result = await database.get(sql, params);
      return result.count;
    } catch (error) {
      logger.error(`Error counting ${this.tableName}`, { error: error.message, conditions });
      throw error;
    }
  }

  // 原生SQL查询
  static async rawQuery(sql, params = []) {
    try {
      const result = await database.all(sql, params);
      logger.logDatabase('RAW_QUERY', 'custom', { sql: sql.substring(0, 100) + '...', paramCount: params.length });
      return result;
    } catch (error) {
      logger.error('Error executing raw query', { error: error.message, sql });
      throw error;
    }
  }
}

module.exports = BaseModel;