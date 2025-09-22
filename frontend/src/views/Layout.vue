<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="250px" class="sidebar">
      <div class="logo">
        <h2>RSS订阅服务</h2>
      </div>
      
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        router
        unique-opened
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        
        <el-menu-item index="/feeds">
          <el-icon><Connection /></el-icon>
          <span>订阅管理</span>
        </el-menu-item>
        
        <el-menu-item index="/articles">
          <el-icon><Document /></el-icon>
          <span>文章列表</span>
        </el-menu-item>
        
        <el-menu-item index="/scripts">
          <el-icon><Edit /></el-icon>
          <span>脚本管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-icon><User /></el-icon>
              {{ authStore.user?.username }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主要内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  House,
  Connection,
  Document,
  Edit,
  User,
  ArrowDown
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 组件挂载时检查认证状态
onMounted(() => {
  console.log('Layout组件已挂载')
  console.log('当前认证状态:', authStore.isAuthenticated)
  console.log('当前用户信息:', authStore.user)
  
  // 如果没有认证，重定向到登录页
  if (!authStore.isAuthenticated) {
    console.warn('用户未认证，重定向到登录页')
    router.push('/login')
  }
})

// 面包屑导航
const breadcrumbs = computed(() => {
  const routeMap = {
    '/': { name: '控制台' },
    '/feeds': { name: '订阅管理' },
    '/feeds/create': { name: '添加订阅' },
    '/articles': { name: '文章列表' },
    '/scripts': { name: '脚本管理' },
    '/profile': { name: '个人设置' }
  }
  
  const matched = route.matched
  const breadcrumbList = []
  
  matched.forEach(item => {
    if (item.path && routeMap[item.path]) {
      breadcrumbList.push({
        path: item.path,
        name: routeMap[item.path].name
      })
    }
  })
  
  return breadcrumbList
})

// 处理用户下拉菜单命令
const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        authStore.logout()
        ElMessage.success('已退出登录')
        router.push('/login')
      } catch {
        // 用户取消
      }
      break
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  color: white;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #434a50;
}

.logo h2 {
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 500;
}

.sidebar-menu {
  border: none;
  background-color: transparent;
}

.sidebar-menu .el-menu-item {
  color: #bfcbd9;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #434a50;
  color: #409eff;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #409eff;
  color: white;
}

.header {
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-dropdown:hover {
  background-color: #f5f7fa;
}

.user-dropdown .el-icon {
  margin-right: 5px;
}

.user-dropdown .el-icon--right {
  margin-left: 5px;
  margin-right: 0;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>