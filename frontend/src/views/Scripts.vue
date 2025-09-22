<template>
  <div class="scripts-page">
    <div class="page-header">
      <div class="header-left">
        <h1>脚本管理</h1>
        <p>创建和管理您的RSS处理脚本</p>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧：脚本编辑器 -->
      <el-col :span="16">
        <el-card class="editor-card">
          <ScriptEditor
            ref="scriptEditorRef"
            v-model="scriptContent"
            :feed-id="selectedFeed === 'all' ? '' : selectedFeed"
            :show-save-button="true"
            :show-test-results="false"
            :show-delete-button="true"
            @test-success="handleTestSuccess"
            @test-error="handleTestError"
            @save-success="handleSaveSuccess"
            @save-error="handleSaveError"
            @script-selected="script => selectedScript = script"
            @delete-success="handleDeleteSuccess"
          />
        </el-card>
      </el-col>

      <!-- 右侧：测试结果 -->
      <el-col :span="8">
        <el-card class="test-results-card">
          <template #header>
            <div class="card-header">
              <span>测试结果</span>
              <div class="header-actions">
                <el-select v-model="selectedFeed" placeholder="选择订阅源" style="width: 150px;">
                  <el-option label="所有订阅源" value="all" />
                  <el-option v-for="feed in feedsStore.feeds" :key="feed.id" :label="feed.title"
                    :value="feed.id" />
                </el-select>
              </div>
            </div>
          </template>

          <div v-if="testResults.length > 0" class="test-results">
            <div v-for="(result, index) in testResults" :key="index" class="test-result-item">
              <div v-if="result.success" class="result-success">
                <div v-if="result.result.action === 'keep'">
                  <p><strong>操作：</strong> 保留文章</p>
                  <div class="article-preview">
                    <p><strong>标题：</strong> {{ result.result.article.title }}</p>
                    <p><strong>链接：</strong> <a :href="result.result.article.link" target="_blank">{{result.result.article.link }}</a></p>
                    <p><strong>描述：</strong> 
                      <span class="truncated-text">{{ result.result.article.description }}</span>
                    </p>
                  </div>
                  <p v-if="result.result.webhook"><strong>Webhook：</strong> 已触发</p>
                </div>
                <div v-else-if="result.result.action === 'filter'">
                  <p><strong>操作：</strong> 过滤文章</p>
                  <p v-if="result.result.reason"><strong>原因：</strong> {{ result.result.reason }}</p>
                </div>
              </div>
              <div v-else class="result-error">
                <p><strong>错误：</strong> {{ result.error }}</p>
              </div>
            </div>
          </div>

          <div v-else-if="scriptsStore.loading" class="test-placeholder">
            <el-skeleton :rows="5" animated />
          </div>

          <div v-else class="test-placeholder">
            <el-empty description="暂无测试结果" />
            <p class="placeholder-text">点击"测试脚本"按钮运行脚本测试</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useScriptsStore } from '@/stores/scripts'
import { useFeedsStore } from '@/stores/feeds'
import ScriptEditor from '@/components/ScriptEditor.vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const scriptsStore = useScriptsStore()
const feedsStore = useFeedsStore()

const scriptContent = ref('// 在此编写您的脚本\nfunction processArticle(article, rawItem) {\n  // 示例：保留所有文章\n  return {\n    action: \'keep\',\n    article: article\n  };\n}')
const selectedFeed = ref('all')
const testResults = ref([])
const scriptEditorRef = ref()
const selectedScript = ref(null)

// 处理测试成功
const handleTestSuccess = (result) => {
  testResults.value = result.results || []
}

// 处理测试失败
const handleTestError = (error) => {
  console.error('Script test failed:', error)
}

// 处理保存成功
const handleSaveSuccess = (data) => {
  // 如果是新保存的脚本，自动选中它
  if (!data.isEditing && data.script) {
    selectedScript.value = data.script
  }
}

// 处理保存失败
const handleSaveError = (error) => {
  console.error('Script save failed:', error)
}

// 处理删除成功
const handleDeleteSuccess = async () => {
  // 清空测试结果
  testResults.value = []
  // 重置选中的脚本
  selectedScript.value = null
}

onMounted(async () => {
  // 加载订阅源列表（如果尚未加载）
  if (feedsStore.feeds.length === 0) {
    await feedsStore.fetchFeeds()
  }
  
  // 加载脚本列表
  await scriptsStore.fetchScripts()
})
</script>

<style scoped>
.scripts-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.editor-card,
.test-results-card {
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.test-results {
  max-height: 600px;
  overflow-y: auto;
}

.test-result-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.test-result-item:last-child {
  margin-bottom: 0;
}

.result-success {
  color: #67c23a;
}

.result-error {
  color: #f56c6c;
}

.article-preview {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
}

.article-preview p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.truncated-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.test-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.placeholder-text {
  margin-top: 16px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .scripts-page {
    padding: 10px;
  }
  
  .el-row {
    flex-direction: column;
  }
  
  .el-col {
    width: 100% !important;
    margin-bottom: 20px;
  }
}
</style>