#!/bin/bash

# RSS订阅服务启动脚本

echo "🚀 启动RSS订阅服务..."

# 检查Node.js版本
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $node_version"

# 检查npm
npm_version=$(npm -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 错误: 未找到npm"
    exit 1
fi

echo "✅ npm版本: $npm_version"

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi

# 初始化数据库
echo "🗄️ 初始化数据库..."
if [ ! -f "database/rss_service.db" ]; then
    npm run init-db
    if [ $? -ne 0 ]; then
        echo "❌ 数据库初始化失败"
        exit 1
    fi
    echo "✅ 数据库初始化完成"
else
    echo "✅ 数据库已存在"
fi

# 启动后端服务
echo "🔧 启动后端服务..."
npm run dev &
backend_pid=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if ! kill -0 $backend_pid 2>/dev/null; then
    echo "❌ 后端服务启动失败"
    exit 1
fi

echo "✅ 后端服务已启动 (PID: $backend_pid)"

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        kill $backend_pid
        exit 1
    fi
fi

# 启动前端服务
echo "🎨 启动前端服务..."
npm run dev &
frontend_pid=$!

# 等待前端启动
sleep 5

# 检查前端是否启动成功
if ! kill -0 $frontend_pid 2>/dev/null; then
    echo "❌ 前端服务启动失败"
    kill $backend_pid
    exit 1
fi

echo "✅ 前端服务已启动 (PID: $frontend_pid)"

echo ""
echo "🎉 RSS订阅服务启动成功！"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:8080"
echo "   后端: http://localhost:3000"
echo ""
echo "📝 使用说明:"
echo "   1. 打开浏览器访问 http://localhost:8080"
echo "   2. 注册新账户或使用现有账户登录"
echo "   3. 添加RSS订阅源开始使用"
echo ""
echo "⏹️  停止服务: Ctrl+C"
echo ""

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $backend_pid $frontend_pid 2>/dev/null; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
while true; do
    sleep 1
done