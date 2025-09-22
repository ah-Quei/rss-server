const express = require('express');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 验证输入
    if (!username || !password || !email) {
      return res.status(400).json({ error: '用户名、密码和邮箱都是必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户是否已存在
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建用户
    const userId = await User.create({ username, password, email });
    const token = generateToken(userId);

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: userId, username, email }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必填项' });
    }

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isValidPassword = await User.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成token
    const token = generateToken(user.id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        created_at: req.user.created_at
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码都是必填项' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }

    // 验证当前密码
    const user = await User.findByUsername(req.user.username);
    const isValidPassword = await User.validatePassword(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    // 更新密码
    await User.updatePassword(req.user.id, newPassword);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;