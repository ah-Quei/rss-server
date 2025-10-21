const BaseModel = require('./BaseModel');

class Article extends BaseModel {
    static get tableName() {
        return 'articles';
    }

    static get fillableFields() {
        return ['feed_id', 'title', 'link', 'description', 'pub_date', 'guid', 'content', 'processed'];
    }

    static async create(articleData) {
        const {feedId, title, link, description, pubDate, guid, content, rawJson} = articleData;

        // 检查是否已存在相同的文章
        const existing = await super.rawQuery(
            'SELECT id FROM articles WHERE feed_id = ? AND (guid = ? OR link = ?)',
            [feedId, guid, link]
        );

        if (existing.length > 0) {
            return existing[0].id;
        }

        return await super.create({
            feed_id: feedId,
            title,
            link,
            description,
            pub_date: pubDate,
            guid,
            content: content || '',
            raw_json: rawJson,
            processed: false,
        });
    }

    static async findByFeedId(feedId, options = {}) {
        const {limit = 50, offset = 0, processed} = options;
        const conditions = {feed_id: feedId};

        if (processed !== undefined) {
            conditions.processed = processed;
        }

        if (limit) {
            // 计算页码：offset / limit + 1
            const page = Math.floor((offset || 0) / limit) + 1;
            return await super.findWithPagination(
                page,
                limit,
                conditions,
                'pub_date DESC'
            );
        }

        return await super.findAll(conditions, 'pub_date DESC');
    }

    static async findByUserId(userId, options = {}) {
        const {limit = 50, offset = 0, category, search} = options;
        let sql = `
            SELECT a.*, f.title as feed_title, f.category
            FROM articles a
                     JOIN feeds f ON a.feed_id = f.id
            WHERE f.user_id = ?
        `;
        const params = [userId];

        if (category) {
            sql += ' AND f.category = ?';
            params.push(category);
        }

        if (search) {
            sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY a.pub_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return await super.rawQuery(sql, params);
    }

    static async countByUserId(userId, options = {}) {
        const {category, search} = options;
        let sql = `
            SELECT COUNT(*) as total
            FROM articles a
                     JOIN feeds f ON a.feed_id = f.id
            WHERE f.user_id = ?
        `;
        const params = [userId];

        if (category) {
            sql += ' AND f.category = ?';
            params.push(category);
        }

        if (search) {
            sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const result = await super.rawQuery(sql, params);
        return result[0]?.total || 0;
    }

    static async markAsProcessed(articleId) {
        return await super.update(articleId, {processed: true});
    }

    static async markAsRead(articleId) {
        return await super.update(articleId, {is_read: true});
    }

    static async markAsUnread(articleId) {
        return await super.update(articleId, {is_read: false});
    }

    static async deleteByFeedId(feedId) {
        return await super.rawQuery(
            'DELETE FROM articles WHERE feed_id = ?',
            [feedId]
        );
    }

    static async getUnprocessedByFeedId(feedId) {
        return await super.findAll(
            {feed_id: feedId, processed: false},
            {orderBy: 'pub_date DESC'}
        );
    }

    static async getStats(userId) {
        const result = await super.rawQuery(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN is_read = 1 THEN 1 END) as read,
        COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread
            FROM articles a
                JOIN feeds f
            ON a.feed_id = f.id
            WHERE f.user_id = ?
        `, [userId]);

        const stats = result[0] || {};
        return {
            total: stats.total || 0,
            read: stats.read || 0,
            unread: stats.unread || 0
        };
    }

    static async findByGuidOrLink(feedId, guid, link) {
        const result = await super.rawQuery(
            'SELECT * FROM articles WHERE feed_id = ? AND (guid = ? OR link = ?)',
            [feedId, guid, link]
        );
        return result.length > 0 ? result[0] : null;
    }

    // 继承了BaseModel的其他方法：
    // - findById()
    // - findAll()
    // - findWithPagination()
    // - update()
    // - delete()
    // - exists()
    // - count()
    // - deleteMultiple()
    // - rawQuery()
}

module.exports = Article;