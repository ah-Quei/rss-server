const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const database = require('./utils/database');
const cronService = require('./services/cronService');
const { errorHandler, notFoundHandler, setupProcessHandlers } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feeds');
const articleRoutes = require('./routes/articles');
const scriptRoutes = require('./routes/scripts');
const cronRoutes = require('./routes/cron');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
// app.use(helmet());
// 中间件
app.use(helmet({
  contentSecurityPolicy: false, // 禁用 CSP，避免资源加载问题
  hsts: false, // 禁用 HSTS，避免强制 HTTPS
  crossOriginEmbedderPolicy: false, // 禁用跨域嵌入策略
  crossOriginOpenerPolicy: false // 禁用 COOP，避免不可信来源警告
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/feeds', feedRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/cron', cronRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 前端路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// 404处理中间件
app.use(notFoundHandler);

// 统一错误处理中间件
app.use(errorHandler);

// 设置进程异常处理
setupProcessHandlers();

// 启动服务器
async function startServer() {
  try {
    await database.connect();
    console.log('数据库连接成功');

    // 启动定时任务服务
    cronService.start();
    console.log('定时任务服务已启动');

    const now = new Date();
    const formatted = now.toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai' // 保证固定为北京时间
    });
    // 格式: 2025-09-22 13:25:30
    console.log(`启动时间：${formatted}`);

    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  // 停止定时任务
  cronService.stop();
  await database.close();
  process.exit(0);
});