<template>
  <div class="feeds-page">
    <div class="page-header">
      <div class="header-left">
        <h1>订阅管理</h1>
        <p>管理您的RSS订阅源</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="$router.push('/feeds/create')">
          <el-icon><Plus /></el-icon>
          添加订阅源
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select
            v-model="filters.category"
            placeholder="选择分类"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部分类" value="" />
            <el-option
              v-for="category in feedsStore.categories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filters.status"
            placeholder="选择状态"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部状态" value="" />
            <el-option label="正常" value="active" />
            <el-option label="异常" value="error" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索订阅源标题或URL"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button @click="refreshFeeds">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 订阅源列表 -->
    <el-card class="feeds-card">
      <el-table
        v-loading="feedsStore.loading"
        :data="filteredFeeds"
        style="width: 100%"
      >
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="feed-title">
              <strong>{{ row.title }}</strong>
              <div class="feed-url">{{ row.url }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.fetch_status)"
              size="small"
            >
              {{ getStatusText(row.fetch_status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="最后更新" width="180">
          <template #default="{ row }">
            <div v-if="row.last_fetch">
              {{ formatDate(row.last_fetch) }}
            </div>
            <span v-else class="text-muted">从未更新</span>
          </template>
        </el-table-column>
        
        <el-table-column label="脚本" width="80">
          <template #default="{ row }">
            <el-icon v-if="row.script" class="script-icon" color="#409eff">
              <Edit />
            </el-icon>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="refreshFeed(row)"
            >
              刷新
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="editFeed(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteFeed(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="filteredFeeds.length"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFeedsStore } from '@/stores/feeds'
import dayjs from 'dayjs'
import {
  Plus,
  Search,
  Refresh,
  Edit
} from '@element-plus/icons-vue'

const router = useRouter()
const feedsStore = useFeedsStore()

const searchKeyword = ref('')
const filters = ref({
  category: '',
  status: ''
})

const pagination = ref({
  page: 1,
  size: 20
})

// 过滤后的订阅源
const filteredFeeds = computed(() => {
  let feeds = feedsStore.feeds

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    feeds = feeds.filter(feed =>
      feed.title.toLowerCase().includes(keyword) ||
      feed.url.toLowerCase().includes(keyword)
    )
  }

  // 按分类过滤
  if (filters.value.category) {
    feeds = feeds.filter(feed => feed.category === filters.value.category)
  }

  // 按状态过滤
  if (filters.value.status) {
    feeds = feeds.filter(feed => feed.status === filters.value.status)
  }

  return feeds
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    success: 'success',
    error: 'danger',
    pending: 'warning'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    success: '正常',
    error: '异常',
    pending: '等待中'
  }
  return statusMap[status] || '未知'
}

// 处理筛选变化
const handleFilterChange = () => {
  pagination.value.page = 1
}

// 处理搜索
const handleSearch = () => {
  pagination.value.page = 1
}

// 刷新订阅源列表
const refreshFeeds = async () => {
  await feedsStore.fetchFeeds()
  await feedsStore.fetchCategories()
}

// 刷新单个订阅源
const refreshFeed = async (feed) => {
  const result = await feedsStore.refreshFeed(feed.id)
  if (result.success) {
    ElMessage.success(`${feed.title} 刷新成功`)
    await refreshFeeds()
  }
}

// 编辑订阅源
const editFeed = (feed) => {
  router.push(`/feeds/${feed.id}/edit`)
}

// 删除订阅源
const deleteFeed = async (feed) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除订阅源 "${feed.title}" 吗？此操作将同时删除相关的所有文章。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await feedsStore.deleteFeed(feed.id)
    if (result.success) {
      ElMessage.success('删除成功')
    }
  } catch {
    // 用户取消删除
  }
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pagination.value.size = size
  pagination.value.page = 1
}

// 处理页码变化
const handleCurrentChange = (page) => {
  pagination.value.page = page
}

// 初始化数据
onMounted(async () => {
  await refreshFeeds()
})
</script>

<style scoped>
.feeds-page {
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

.feeds-card {
  margin-bottom: 20px;
}

.feed-title strong {
  display: block;
  color: #303133;
  margin-bottom: 4px;
}

.feed-url {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.script-icon {
  font-size: 16px;
}

.text-muted {
  color: #c0c4cc;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>