const BaseModel = require('./BaseModel');

class Script extends BaseModel {
  static get tableName() {
    return 'scripts';
  }

  static get fillableFields() {
    return ['user_id', 'name', 'description', 'script', 'is_template'];
  }

  static async create(scriptData) {
    const { userId, name, description, script, isTemplate } = scriptData;
    
    const result = await super.create({
      user_id: userId,
      name,
      description: description || '',
      script,
      is_template: isTemplate ? 1 : 0
    });
    
    return {
      id: result,
      user_id: userId,
      name,
      description,
      script,
      is_template: isTemplate ? 1 : 0,
      created_at: new Date().toISOString()
    };
  }

  static async findByUserId(userId, options = {}) {
    const { search } = options;
    let sql = 'SELECT * FROM scripts WHERE user_id = ? OR is_template = 1';
    const params = [userId];

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    sql += ' ORDER BY is_template ASC, created_at DESC';

    return await super.rawQuery(sql, params);
  }

  // 继承的方法：
  // - findById(id)
  // - findAll(conditions)
  // - findOne(conditions)
  // - update(id, data)
  // - delete(id)
  // - rawQuery(sql, params)

  static async update(scriptId, updateData) {
    const { name, description, script } = updateData;
    
    return await super.rawQuery(
      'UPDATE scripts SET name = ?, description = ?, script = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_template = 0',
      [name, description, script, scriptId]
    );
  }

  static async delete(scriptId, userId) {
    // 检查是否有feed使用此脚本
    const usedByFeeds = await super.rawQuery(
      'SELECT COUNT(*) as count FROM feeds WHERE script_id = ?',
      [scriptId]
    );

    if (usedByFeeds && usedByFeeds[0] && usedByFeeds[0].count > 0) {
      throw new Error('此脚本正在被订阅源使用，无法删除');
    }

    return await super.rawQuery(
      'DELETE FROM scripts WHERE id = ? AND user_id = ? AND is_template = 0',
      [scriptId, userId]
    );
  }

  static async checkOwnership(scriptId, userId) {
    const script = await super.rawQuery(
      'SELECT * FROM scripts WHERE id = ? AND (user_id = ? OR is_template = 1)',
      [scriptId, userId]
    );
    
    return script.length > 0;
  }

  static async getTemplates() {
    return await super.rawQuery(
      'SELECT * FROM scripts WHERE is_template = 1 ORDER BY name'
    );
  }
}

module.exports = Script;