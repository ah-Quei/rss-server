# RSS订阅服务 2.0

一个现代化的RSS订阅管理系统，支持多用户、自定义脚本处理和定时任务。

## 功能特性

### 🔐 用户管理
- 用户注册和登录
- JWT身份验证
- 密码加密存储
- 个人资料管理

### 📡 订阅管理
- 添加/编辑/删除RSS订阅源
- 订阅源分类管理
- 订阅源状态监控
- 手动刷新订阅内容

### 📰 文章管理
- 文章列表浏览
- 文章搜索和过滤
- 标记已读/未读
- 批量操作支持

### 🔧 脚本处理
- 自定义JavaScript脚本
- 文章内容过滤和转换
- Webhook推送支持
- 脚本执行日志

### ⏰ 定时任务
- 自动获取RSS内容
- 可配置的抓取频率（每个订阅源独立设置）
- 旧数据自动清理
- 支持手动触发任务

## 技术栈

### 后端
- **Node.js** - 运行时环境
- **Express** - Web框架
- **SQLite** - 数据库
- **JWT** - 身份验证
- **node-cron** - 定时任务
- **rss-parser** - RSS解析
- **vm2** - 安全脚本执行

### 前端
- **Vue 3** - 前端框架
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Axios** - HTTP客户端
- **Monaco Editor** - 代码编辑器

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 方式一：一键启动（推荐）

项目提供了一键启动脚本，自动完成所有安装和启动步骤：

```bash
git clone <repository-url>
cd rss-service-2.0
chmod +x start.sh
./start.sh
```

脚本会自动：
1. 检查Node.js和npm版本
2. 安装后端依赖
3. 初始化数据库（如果不存在）
4. 启动后端服务（端口3000）
5. 安装前端依赖
6. 启动前端服务（端口8080）
7. 输出访问地址和使用说明

启动完成后，访问 `http://localhost:8080` 即可使用。

### 方式二：手动安装

1. **克隆项目**
```bash
git clone <repository-url>
cd rss-service-2.0
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd ../frontend
npm install
```

4. **初始化数据库**
```bash
cd ../backend
npm run init-db
```

5. **启动开发服务器**

后端服务（端口3000）：
```bash
cd backend
npm run dev
```

前端服务（端口8080）：
```bash
cd frontend
npm run dev
```

6. **访问应用**
打开浏览器访问 `http://localhost:8080`

## 项目结构

```
rss-service-2.0/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由定义
│   │   ├── services/       # 业务逻辑
│   │   ├── middleware/     # 中间件
│   │   └── utils/          # 工具函数
│   ├── database/           # 数据库文件
│   └── package.json
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── stores/         # 状态管理
│   │   ├── router/         # 路由配置
│   │   └── api/            # API接口
│   └── package.json
└── README.md
```

## API文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取用户信息
- `PUT /api/auth/password` - 修改密码

### 订阅源接口
- `GET /api/feeds/validate` - 验证RSS URL
- `GET /api/feeds` - 获取订阅源列表
- `POST /api/feeds` - 创建订阅源
- `GET /api/feeds/:id` - 获取单个订阅源
- `PUT /api/feeds/:id` - 更新订阅源
- `DELETE /api/feeds/:id` - 删除订阅源
- `POST /api/feeds/:id/refresh` - 手动刷新订阅源
- `GET /api/feeds/categories/list` - 获取用户所有分类

### 文章接口
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取文章详情
- `PUT /api/articles/:id/read` - 标记文章已读
- `PUT /api/articles/:id/unread` - 标记文章未读
- `DELETE /api/articles/:id` - 删除文章
- `GET /api/articles/stats/summary` - 获取文章统计信息
- `PUT /api/articles/batch/read` - 批量标记已读

### 脚本接口
- `POST /api/scripts/test` - 测试脚本
- `GET /api/scripts/logs/:feedId` - 获取脚本执行日志
- `POST /api/scripts` - 创建脚本
- `GET /api/scripts` - 获取脚本列表
- `GET /api/scripts/:id` - 获取单个脚本
- `PUT /api/scripts/:id` - 更新脚本
- `DELETE /api/scripts/:id` - 删除脚本

### 定时任务接口
- `GET /api/cron/status` - 获取定时任务状态
- `POST /api/cron/run-fetch` - 手动执行RSS获取任务
- `POST /api/cron/run-cleanup` - 手动执行清理任务

## 脚本开发

### 脚本格式
```javascript
function processArticle(article) {
  // 处理逻辑
  return {
    action: 'keep' | 'filter',
    article: modifiedArticle, // 可选
    reason: 'string' // 可选
  };
}
```

### 可用函数

#### 基础功能
- `console.log()` / `console.error()` / `console.warn()` - 输出日志
- `Date` - 日期处理
- `JSON` - JSON处理
- `Math` - 数学运算
- `parseInt()` / `parseFloat()` - 数值转换
- `String` / `Array` / `Object` - 基础对象
- `RegExp` - 正则表达式
- `URL` - URL处理

#### HTTP请求
```javascript
// GET请求
const response = await http.get('https://api.example.com/data');
if (response.success) {
  console.log(response.data);
}

// POST请求
const result = await http.post('https://api.example.com/webhook', {
  title: article.title,
  content: article.content
});
```

#### Webhook推送
```javascript
// 发送webhook
const result = await webhook('https://your-webhook-url.com', {
  title: article.title,
  link: article.link,
  description: article.description
}, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token'
  }
});
```

#### OpenAI集成
```javascript
// 创建OpenAI客户端
const client = openai.createClient('your-api-key');

// 使用ChatGPT分析文章
const completion = await client.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'user',
      content: `请分析这篇文章的主题：${article.title}\n${article.description}`
    }
  ],
  max_tokens: 500
});

console.log(completion.choices[0].message.content);
```

#### 加密功能
```javascript
// MD5哈希
const hash = crypto.md5(article.title);

// SHA256哈希
const sha = crypto.sha256(article.content);

// Base64编码/解码
const encoded = crypto.base64Encode('hello world');
const decoded = crypto.base64Decode(encoded);

// 生成随机字符串
const random = crypto.randomString(16);

// HMAC签名
const signature = crypto.hmac('sha256', 'secret-key', article.link);
```

#### Buffer处理
```javascript
// 创建Buffer
const buffer = Buffer.from('hello world', 'utf8');

// 检查是否为Buffer
if (Buffer.isBuffer(buffer)) {
  console.log('这是一个Buffer对象');
}
```

### 文章对象属性
- `article.id` - 文章ID
- `article.title` - 标题
- `article.description` - 描述
- `article.link` - 链接
- `article.content` - 内容
- `article.pub_date` - 发布时间
- `article.guid` - 全局唯一标识符
- `article.feed_id` - 订阅源ID

### 脚本示例

#### 过滤特定关键词
```javascript
function processArticle(article) {
  const keywords = ['广告', '推广', '营销'];
  const hasKeyword = keywords.some(keyword => 
    article.title.includes(keyword) || 
    article.description.includes(keyword)
  );
  
  if (hasKeyword) {
    return {
      action: 'filter',
      reason: '包含广告关键词'
    };
  }
  
  return { action: 'keep' };
}
```

#### 发送重要文章到Webhook
```javascript
function processArticle(article) {
  const importantKeywords = ['重要', '紧急', '通知'];
  const isImportant = importantKeywords.some(keyword => 
    article.title.includes(keyword)
  );
  
  if (isImportant) {
    webhook('https://your-webhook.com/important', {
      title: article.title,
      link: article.link,
      timestamp: new Date().toISOString()
    });
  }
  
  return { action: 'keep' };
}
```

#### 使用AI分析文章情感
```javascript
function processArticle(article) {
  const client = openai.createClient('your-openai-api-key');
  
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `分析这篇文章的情感倾向（正面/负面/中性）：${article.title}`
      }],
      max_tokens: 50
    });
    
    const sentiment = completion.choices[0].message.content;
    console.log(`文章情感：${sentiment}`);
    
    // 过滤负面文章
    if (sentiment.includes('负面')) {
      return {
        action: 'filter',
        reason: '负面情感文章'
      };
    }
  } catch (error) {
    console.error('AI分析失败:', error.message);
  }
  
  return { action: 'keep' };
}
```

## 配置说明

### 环境变量
在 `backend/.env` 文件中配置：

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
```

### 配置项说明
- `NODE_ENV` - 运行环境（development/production）
- `PORT` - 后端服务端口，默认3000
- `JWT_SECRET` - JWT令牌签名密钥，生产环境请使用强密码

### 数据库配置
- 数据库文件位置：`backend/database/rss_service.db`
- 使用SQLite数据库，无需额外配置
- 首次运行需执行 `npm run init-db` 初始化数据库

### 脚本执行配置
- 脚本执行超时：5秒（硬编码）
- 沙箱环境：使用vm2提供安全隔离
- 日志保留：7天（可在代码中修改）

### 定时任务与抓取频率

#### 全局定时任务
- **RSS内容检查**：每小时执行一次，检查所有活跃订阅源
- **数据清理**：每天凌晨2点执行，清理旧文章和日志

#### 订阅源刷新频率
每个订阅源可以独立设置刷新间隔：
- 默认刷新间隔：60分钟
- 最小间隔：1分钟
- 调度规则：
  - 间隔 < 60分钟：按分钟调度
  - 间隔 ≥ 60分钟：按小时调度

#### 手动操作
- 可通过API手动触发RSS获取任务
- 可手动执行数据清理任务
- 支持单个订阅源的手动刷新

## 部署

### 生产环境部署

1. **构建前端**
```bash
cd frontend
npm run build
```

2. **启动后端**
```bash
cd backend
NODE_ENV=production npm start
```

3. **使用PM2管理进程**
```bash
npm install -g pm2
pm2 start src/app.js --name rss-service
```

### Docker部署

项目暂未提供Docker配置文件，但可以参考以下步骤手动创建：

#### 创建Dockerfile（后端）
```dockerfile
FROM node:16-alpine

WORKDIR /app

# 安装后端依赖
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制后端代码
COPY backend/ ./

# 构建前端并复制到后端静态目录
COPY frontend/dist ./public

EXPOSE 3000

CMD ["npm", "start"]
```

#### 创建docker-compose.yml
```yaml
version: '3.8'
services:
  rss-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-production-secret
    volumes:
      - ./data:/app/database
    restart: unless-stopped
```

#### 构建和运行
```bash
# 先构建前端
cd frontend && npm run build && cd ..

# 构建Docker镜像
docker-compose build

# 启动服务
docker-compose up -d
```

**注意事项：**
- 生产环境请修改JWT_SECRET为强密码
- 数据库文件会保存在./data目录中
- 确保SQLite3在Docker环境中正确安装

## 开发指南

### 添加新功能
1. 后端：在相应的controller、model、route中添加代码
2. 前端：在views、stores、api中添加相应组件和逻辑
3. 更新API文档

### 代码规范
- 使用ESLint进行代码检查
- 遵循Vue 3 Composition API规范
- 使用async/await处理异步操作

## 常见问题

### Q: 如何添加新的RSS源？
A: 登录后点击"添加订阅源"，输入RSS URL和相关信息即可。

### Q: 脚本不执行怎么办？
A: 检查脚本语法是否正确，确保包含processArticle函数。

### Q: 如何备份数据？
A: 复制backend/database目录下的数据库文件即可。

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交Issue或联系开发者。