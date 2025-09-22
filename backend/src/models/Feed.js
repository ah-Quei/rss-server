const BaseModel = require('./BaseModel');

class Feed extends BaseModel {
  static get tableName() {
    return 'feeds';
  }

  static get fillableFields() {
    return ['user_id', 'title', 'url', 'description', 'category', 'refresh_interval', 'script_id'];
  }

  static async create(feedData) {
    const { userId, title, url, category, refreshInterval, scriptId } = feedData;
    
    return await super.create({
      user_id: userId,
      title,
      url,
      category: category || '默认',
      refresh_interval: refreshInterval || 60,
      script_id: scriptId || null,
      status: 'active'
    });
  }

  static async findByUserId(userId, options = {}) {
    const { category, status, limit, offset } = options;
    const conditions = { user_id: userId };

    if (category) {
      conditions.category = category;
    }

    if (status) {
      conditions.status = status;
    }

    if (limit) {
      // 计算页码：offset / limit + 1
      const page = Math.floor((offset || 0) / limit) + 1;
      return await super.findWithPagination(
        page,
        limit,
        conditions,
        'created_at DESC'
      );
    }

    return await super.findAll(conditions, 'created_at DESC');
  }

  static async findById(feedId, userId) {
    return await super.findOne({ id: feedId, user_id: userId });
  }

  static async update(feedId, userId, updateData) {
    const { title, url, category, refreshInterval, scriptId, status } = updateData;
    
    return await super.update(feedId, {
      title,
      url,
      category,
      refresh_interval: refreshInterval,
      script_id: scriptId,
      status
    }, { user_id: userId });
  }

  static async delete(feedId, userId) {
    // 先删除相关文章
    await super.rawQuery('DELETE FROM articles WHERE feed_id = ?', [feedId]);
    
    // 删除订阅源
    return await super.delete(feedId, { user_id: userId });
  }

  static async updateLastFetch(feedId, status = 'success', errorMessage = null) {
    return await super.rawQuery(
      'UPDATE feeds SET last_fetch = CURRENT_TIMESTAMP, fetch_status = ?, fetch_error = ? WHERE id = ?',
      [status, errorMessage, feedId]
    );
  }

  static async getCategories(userId) {
    const result = await super.rawQuery(
      'SELECT DISTINCT category FROM feeds WHERE user_id = ? ORDER BY category',
      [userId]
    );
    
    return result.map(row => row.category);
  }

  static async getActiveFeeds() {
    return await super.findAll({ status: 'active' });
  }

  // 继承了BaseModel的其他方法：
  // - findAll()
  // - findWithPagination()
  // - exists()
  // - count()
  // - deleteMultiple()
  // - rawQuery()
}

module.exports = Feed;