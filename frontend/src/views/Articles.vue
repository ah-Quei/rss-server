<template>
  <div class="articles-page">
    <div class="page-header">
      <div class="header-left">
        <h1>文章列表</h1>
        <p>浏览和管理您的RSS文章</p>
      </div>
      <div class="header-right">
        <el-button v-if="selectedArticles.length > 0" type="primary" @click="batchMarkAsRead">
          批量标记已读 ({{ selectedArticles.length }})
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select v-model="filters.category" placeholder="选择分类" clearable @change="handleFilterChange">
            <el-option label="全部分类" value="" />
            <el-option v-for="category in feedsStore.categories" :key="category" :label="category" :value="category" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.feedId" placeholder="选择订阅源" clearable @change="handleFilterChange">
            <el-option label="全部订阅源" value="" />
            <el-option v-for="feed in feedsStore.feeds" :key="feed.id" :label="feed.title" :value="feed.id" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input v-model="filters.search" placeholder="搜索文章标题或内容" clearable @input="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button @click="refreshArticles">
            <el-icon>
              <Refresh />
            </el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 文章列表 -->
    <el-card class="articles-card">
      <el-table v-loading="articlesStore.loading" :data="paginatedArticles" style="width: 100%"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />

        <el-table-column label="文章" min-width="400">
          <template #default="{ row }">
            <div class="article-content">
              <div class="article-header">
                <h4 class="article-title" :class="{ 'read': row.is_read }" @click="markArticale(row)">
                  <a :href="row.link" target="_blank" style="text-decoration: none; color: inherit;">
                    {{ row.title }}
                  </a>
                </h4>
                <div class="article-actions">
                  <el-button v-if="!row.is_read" type="text" size="small" @click="markAsRead(row)">
                    标记已读
                  </el-button>
                  <el-button v-if="row.is_read" type="text" size="small" @click="markAsUnread(row)">
                    标记未读
                  </el-button>
                </div>
              </div>
              <p class="article-description">{{ row.description }}</p>
              <div class="article-meta">
                <el-tag size="small" type="info" style="color: cornflowerblue;">{{ row.feed_title }}</el-tag>
                <span class="pub-date">{{ formatDate(row.pub_date) }}</span>
                <el-tag v-if="row.processed" size="small" type="success">
                  已处理
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_read ? 'info' : 'primary'" size="small">
              {{ row.is_read ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-dropdown @command="(command) => handleCommand(command, row)">
              <el-button type="text" size="small">
                更多 <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="view">查看详情</el-dropdown-item>
                  <el-dropdown-item v-if="!row.is_read" command="read">
                    标记已读
                  </el-dropdown-item>
                  <el-dropdown-item v-if="row.is_read" command="unread">
                    标记未读
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <div class="pagination-info">
          当前页 {{ pagination.page }} / {{ totalPages }} 页
        </div>
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.size"
          :total="articlesStore.total" :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 文章详情对话框 -->
    <el-dialog v-model="showArticleDetail" :title="currentArticle?.title" width="800px" class="article-dialog">
      <div v-if="currentArticle" class="article-detail">
        <div class="article-meta-detail">
          <el-tag type="info">{{ currentArticle.feed_title }}</el-tag>
          <span class="pub-date">{{ formatDate(currentArticle.pub_date) }}</span>
        </div>

        <div class="article-content-detail">
          <!-- 显示摘要或描述 -->
          <div v-if="currentArticle.summary || currentArticle.description" class="summary-section">
            <h4 class="section-title">摘要</h4>
            <p class="summary-content">
              {{ currentArticle.summary || currentArticle.description || currentArticle.content }}
            </p>
          </div>          
          <!-- 如果没有任何内容 -->
          <div v-if="!currentArticle.summary && !currentArticle.description && !currentArticle.content" class="no-content">
            <el-empty description="暂无内容" :image-size="80" />
          </div>
        </div>

        <div class="article-actions-detail">
          <el-button type="primary" @click="openOriginalLink">
            查看原文
          </el-button>
          <el-button v-if="!currentArticle.is_read" @click="markCurrentAsRead">
            标记已读
          </el-button>
          <el-button v-if="currentArticle.is_read" @click="markCurrentAsUnread">
            标记未读
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useArticlesStore } from '@/stores/articles'
import { useFeedsStore } from '@/stores/feeds'
import dayjs from 'dayjs'
import {
  Search,
  Refresh,
  ArrowDown
} from '@element-plus/icons-vue'

const articlesStore = useArticlesStore()
const feedsStore = useFeedsStore()

// 筛选条件
const filters = ref({
  category: '',
  feedId: '',
  search: ''
})

// 分页 - 使用store中的分页状态
const pagination = computed(() => ({
  page: articlesStore.currentPage,
  size: articlesStore.pageSize
}))

const selectedArticles = ref([])
const showArticleDetail = ref(false)
const currentArticle = ref(null)

// 直接使用store中的文章数据（已在后端进行筛选和分页）
const paginatedArticles = computed(() => {
  return articlesStore.articles
})

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(articlesStore.total / pagination.value.size)
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 处理筛选变化
const handleFilterChange = () => {
  articlesStore.currentPage = 1
  fetchArticles()
}

// 处理搜索
const handleSearch = () => {
  articlesStore.currentPage = 1
  fetchArticles()
}

// 刷新文章列表
const refreshArticles = async () => {
  await fetchArticles()
}

// 获取文章列表
const fetchArticles = async () => {
  const params = {
    page: pagination.value.page,
    limit: pagination.value.size,
    category: filters.value.category || undefined,
    feedId: filters.value.feedId || undefined,
    search: filters.value.search || undefined
  }
  
  // 移除空值
  Object.keys(params).forEach(key => {
    if (params[key] === undefined || params[key] === '') {
      delete params[key]
    }
  })
  
  const result = await articlesStore.fetchArticles(params)
  if (!result.success) {
    ElMessage.error(result.message)
  }
}

const markArticale = (article) => {
  currentArticle.value = article
  // 如果未读，标记为已读
  if (!article.is_read) {
    markAsRead(article)
  }
}
// 打开文章详情
const openArticleDetail = (article) => {
  currentArticle.value = article
  showArticleDetail.value = true
}

// 打开原文链接
const openOriginalLink = () => {
    // 如果未读，标记为已读
  if (!currentArticle.value.is_read) {
    markAsRead(currentArticle.value)
  }
  if (currentArticle.value?.link) {
    window.open(currentArticle.value.link, '_blank')
  }
}

// 标记单篇文章为已读
const markAsRead = async (article) => {
  const result = await articlesStore.markAsRead(article.id)
  if (result.success) {
    ElMessage.success('已标记为已读')
  }
}

// 标记单篇文章为未读
const markAsUnread = async (article) => {
  const result = await articlesStore.markAsUnread(article.id)
  if (result.success) {
    ElMessage.success('已标记为未读')
  }
}

// 标记当前文章为已读
const markCurrentAsRead = async () => {
  if (currentArticle.value) {
    await markAsRead(currentArticle.value)
    currentArticle.value.is_read = true
  }
}

// 标记当前文章为未读
const markCurrentAsUnread = async () => {
  if (currentArticle.value) {
    await markAsUnread(currentArticle.value)
    currentArticle.value.is_read = false
  }
}

// 批量标记为已读
const batchMarkAsRead = async () => {
  const articleIds = selectedArticles.value.map(article => article.id)
  const result = await articlesStore.batchMarkAsRead(articleIds)
  if (result.success) {
    ElMessage.success(`已标记 ${articleIds.length} 篇文章为已读`)
    selectedArticles.value = []
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedArticles.value = selection
}

// 处理命令
const handleCommand = async (command, article) => {
  switch (command) {
    case 'view':
      openArticleDetail(article)
      break
    case 'read':
      await markAsRead(article)
      break
    case 'unread':
      await markAsUnread(article)
      break
    case 'delete':
      await deleteArticle(article)
      break
  }
}

// 删除文章
const deleteArticle = async (article) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文章 "${article.title}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await articlesStore.deleteArticle(article.id)
    if (result.success) {
      ElMessage.success('删除成功')
      await fetchArticles()
    }
  } catch {
    // 用户取消删除
  }
}

// 处理分页大小变化
const handleSizeChange = (newSize) => {
  articlesStore.pageSize = newSize
  articlesStore.currentPage = 1
  fetchArticles()
}

// 处理页码变化
const handleCurrentChange = (newPage) => {
  articlesStore.currentPage = newPage
  fetchArticles()
}

// 初始化数据
onMounted(async () => {
  await Promise.all([
    feedsStore.fetchFeeds(),
    feedsStore.fetchCategories(),
    fetchArticles()
  ])
})
</script>

<style scoped>
.articles-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.header-left h1 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-card {
  margin-bottom: 20px;
}

.articles-card {
  margin-bottom: 20px;
}

.article-content {
  padding: 10px 0;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.article-title {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  flex: 1;
  margin-right: 10px;
  line-height: 1.4;
}

.article-title:hover {
  color: #409eff;
}

.article-title.read {
  color: #909399;
}

.article-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.article-description {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.pub-date {
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.pagination-info {
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
}

.article-dialog .el-dialog__body {
  padding: 20px;
}

.article-detail {
  max-height: 600px;
  overflow-y: auto;
}

.article-meta-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.article-content-detail .section-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #ebeef5;
}

.article-content-detail .summary-section {
  margin-bottom: 20px;
}

.article-content-detail .summary-content {
  color: #606266;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  /* border-left: 3px solid #409eff; */
}

.article-content-detail .content-section {
  margin-bottom: 20px;
}

.article-content-detail .content {
  color: #303133;
  line-height: 1.8;
  padding: 10px;
  background-color: #fafafa;
  border-radius: 4px;
}

.article-content-detail .no-content {
  text-align: center;
  padding: 40px 0;
}

.article-content-detail .content :deep(img) {
  max-width: 100%;
  height: auto;
}

.article-actions-detail {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 10px;
}
</style>