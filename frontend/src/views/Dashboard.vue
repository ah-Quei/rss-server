<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>控制台</h1>
      <p>欢迎使用RSS订阅服务</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon feeds">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ feedsCount }}</div>
              <div class="stats-label">订阅源</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon articles">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ articlesStore.stats.total || 0 }}</div>
              <div class="stats-label">总文章</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon unread">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ articlesStore.stats.unread || 0 }}</div>
              <div class="stats-label">未读文章</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon processed">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ articlesStore.stats.processed || 0 }}</div>
              <div class="stats-label">已处理</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快速操作 -->
    <el-row :gutter="20" class="quick-actions">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快速操作</span>
            </div>
          </template>
          
          <div class="action-buttons">
            <el-button 
              type="primary" 
              size="large"
              @click="$router.push('/feeds/create')"
            >
              <el-icon><Plus /></el-icon>
              添加订阅源
            </el-button>
            
            <el-button 
              type="success" 
              size="large"
              :loading="refreshing"
              @click="refreshAllFeeds"
            >
              <el-icon><Refresh /></el-icon>
              刷新所有订阅
            </el-button>
            
            <el-button 
              type="info" 
              size="large"
              @click="$router.push('/articles')"
            >
              <el-icon><Reading /></el-icon>
              查看文章
            </el-button>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近文章</span>
              <el-button 
                type="text" 
                size="small"
                @click="$router.push('/articles')"
              >
                查看更多
              </el-button>
            </div>
          </template>
          
          <div class="recent-articles">
            <div 
              v-for="article in recentArticles" 
              :key="article.id"
              class="article-item"
              @click="viewArticle(article)"
            >
              <div class="article-title">{{ article.title }}</div>
              <div class="article-meta">
                <span class="feed-title">{{ article.feed_title }}</span>
                <span class="pub-date">{{ formatDate(article.pub_date) }}</span>
              </div>
            </div>
            
            <div v-if="recentArticles.length === 0" class="no-articles">
              暂无文章
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 订阅源状态 -->
    <el-card class="feeds-status">
      <template #header>
        <div class="card-header">
          <span>订阅源状态</span>
          <el-button 
            type="text" 
            size="small"
            @click="$router.push('/feeds')"
          >
            管理订阅源
          </el-button>
        </div>
      </template>
      
      <el-table :data="recentFeeds" style="width: 100%">
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.status === 'active' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'active' ? '正常' : '异常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="180">
          <template #default="{ row }">
            {{ row.last_fetch ? formatDate(row.last_fetch) : '从未更新' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useFeedsStore } from '@/stores/feeds'
import { useArticlesStore } from '@/stores/articles'
import dayjs from 'dayjs'
import {
  Connection,
  Document,
  Bell,
  Check,
  Plus,
  Refresh,
  Reading
} from '@element-plus/icons-vue'

const router = useRouter()
const feedsStore = useFeedsStore()
const articlesStore = useArticlesStore()

const refreshing = ref(false)
const recentArticles = ref([])
const recentFeeds = computed(() => {
  // 确保feeds是数组
  const feedsArray = Array.isArray(feedsStore.feeds) ? feedsStore.feeds : []
  return feedsArray.slice(0, 5)
})
const feedsCount = computed(() => {
  // 确保feeds是数组
  const feedsArray = Array.isArray(feedsStore.feeds) ? feedsStore.feeds : []
  return feedsArray.length
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 查看文章详情
const viewArticle = (article) => {
  window.open(article.link, '_blank')
  articlesStore.markAsRead(article.id)
}

// 刷新所有订阅源
const refreshAllFeeds = async () => {
  refreshing.value = true
  try {
    // 这里应该调用批量刷新API
    ElMessage.success('刷新任务已启动')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 获取最近文章
const fetchRecentArticles = async () => {
  const result = await articlesStore.fetchArticles({ limit: 5 })
  if (result.success) {
    recentArticles.value = articlesStore.articles
  }
}

// 初始化数据
onMounted(async () => {
  await Promise.all([
    feedsStore.fetchFeeds(),
    articlesStore.fetchStats(),
    fetchRecentArticles()
  ])
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 30px;
}

.dashboard-header h1 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.dashboard-header p {
  margin: 0;
  color: #909399;
  font-size: 16px;
}

.stats-row {
  margin-bottom: 30px;
}

.stats-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.stats-card:hover {
  transform: translateY(-2px);
}

.stats-content {
  display: flex;
  align-items: center;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  color: white;
}

.stats-icon.feeds {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon.articles {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon.unread {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stats-icon.processed {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stats-info {
  flex: 1;
}

.stats-number {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 5px;
}

.stats-label {
  color: #909399;
  font-size: 14px;
}

.quick-actions {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  flex: 1;
  min-width: 140px;
}

.recent-articles {
  max-height: 300px;
  overflow-y: auto;
}

.article-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.article-item:hover {
  background-color: #f8f9fa;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 4px;
}

.article-item:last-child {
  border-bottom: none;
}

.article-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.feed-title {
  color: #409eff;
}

.no-articles {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}

.feeds-status {
  margin-bottom: 30px;
}
</style>