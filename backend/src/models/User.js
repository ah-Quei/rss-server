const bcrypt = require('bcryptjs');
const BaseModel = require('./BaseModel');

class User extends BaseModel {
  static get tableName() {
    return 'users';
  }

  static get fillableFields() {
    return ['username', 'password_hash', 'email'];
  }

  static async create(userData) {
    const { username, password, email } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return await super.create({
      username,
      password_hash: hashedPassword,
      email
    });
  }

  static async findByUsername(username) {
    return await super.findOne({ username });
  }

  static async findById(id) {
    // 重写findById方法，排除密码字段
    const user = await super.findById(id);
    if (user) {
      delete user.password_hash;
    }
    return user;
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await super.update(userId, { password_hash: hashedPassword });
  }

  // 继承了BaseModel的其他方法：
  // - findAll()
  // - findWithPagination()
  // - update()
  // - delete()
  // - exists()
  // - count()
  // - deleteMultiple()
  // - rawQuery()
}

module.exports = User;