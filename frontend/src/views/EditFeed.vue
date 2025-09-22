<template>
  <div class="edit-feed-page">
    <div class="page-header">
      <h1>编辑订阅源</h1>
      <p>修改订阅源信息和处理脚本</p>
    </div>

    <!-- 基本信息 -->
    <el-card v-loading="feedsStore.loading" class="basic-info-card">
      <template #header>
        <span>基本信息</span>
      </template>
      <el-form
        ref="feedFormRef"
        :model="feedForm"
        :rules="feedRules"
        label-width="100px"
        class="feed-form"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="feedForm.title"
            placeholder="请输入订阅源标题"
          />
        </el-form-item>

        <el-form-item label="RSS URL" prop="url">
          <el-input
            v-model="feedForm.url"
            placeholder="请输入RSS订阅地址"
          />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select
            v-model="feedForm.category"
            placeholder="选择分类"
          >
            <el-option
              v-for="category in feedsStore.categories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="feedForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 脚本配置 -->
    <el-card class="script-card" style="margin-top: 20px;">
      <template #header>
        <span>脚本配置</span>
      </template>
      
      <ScriptEditor
        v-model="feedForm.script"
        title=""
        description="为此订阅源配置处理脚本（可选）"
        :show-header="false"
        :allow-none="true"
        :show-save-button="false"
        :show-test-button="true"
        :show-test-results="true"
        :testing="scriptsStore.loading"
        :feed-id="route.params.id"
        :initial-script-id="feedForm.scriptId"
        editor-height="300px"
        @test-error="handleTestError"
        ref="scriptEditorRef"
      />
    </el-card>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button
        type="primary"
        :loading="feedsStore.loading"
        @click="handleSubmit"
      >
        保存修改
      </el-button>
      <el-button @click="$router.back()">
        取消
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFeedsStore } from '@/stores/feeds'
import { useScriptsStore } from '@/stores/scripts'
import ScriptEditor from '@/components/ScriptEditor.vue'

const route = useRoute()
const router = useRouter()
const feedsStore = useFeedsStore()
const scriptsStore = useScriptsStore()

const feedFormRef = ref()
const scriptEditorRef = ref()
const feedForm = reactive({
  title: '',
  url: '',
  category: '默认',
  status: 'active',
  scriptId: null,
  script: '' // 保留用于编辑器显示
})

const feedRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入RSS URL', trigger: 'blur' }
  ]
}

// 处理测试失败
const handleTestError = (error) => {
  console.error('Script test failed:', error)
}

const handleSubmit = async () => {
  if (!feedFormRef.value) return

  await feedFormRef.value.validate(async (valid) => {
    if (valid) {
      // 获取当前选择的模板
      const selectedTemplate = scriptEditorRef.value?.getSelectedTemplate()
      
      // 如果选择了"不使用脚本"，则设置scriptId为null
      if (selectedTemplate && selectedTemplate.id === 'none') {
        feedForm.scriptId = null
      } 
      // 如果选择了模板，则使用模板ID
      else if (selectedTemplate && selectedTemplate.id !== 'custom') {
        feedForm.scriptId = selectedTemplate.id
      }
      // 如果是自定义脚本，需要先保存脚本，然后使用返回的脚本ID
      else if (feedForm.script && feedForm.script.trim()) {
        // 保存自定义脚本
        const scriptResult = await scriptsStore.saveScript({
          name: `${feedForm.title} 的脚本`,
          description: `为订阅源 ${feedForm.title} 创建的处理脚本`,
          script: feedForm.script
        })
        
        if (scriptResult.success && scriptResult.data) {
          feedForm.scriptId = scriptResult.data.id
        }
      }
      
      const result = await feedsStore.updateFeed(route.params.id, feedForm)
      if (result.success) {
        ElMessage.success('订阅源更新成功')
        router.push('/feeds')
      } else {
        ElMessage.error(result.message || '更新失败')
      }
    }
  })
}

const loadFeedData = async () => {
  // 先加载所有脚本，确保下拉列表中有数据
  await scriptsStore.fetchScripts()
  
  const result = await feedsStore.fetchFeed(route.params.id)
  if (result.success) {
    const feed = result.feed
    feedForm.title = feed.title
    feedForm.url = feed.url
    feedForm.category = feed.category
    feedForm.status = feed.status
    feedForm.scriptId = feed.script_id || null
    
    // 如果有脚本ID，加载脚本内容
    if (feed.script_id) {
      const scriptResult = await scriptsStore.fetchScript(feed.script_id)
      if (scriptResult.success && scriptResult.script) {
        feedForm.script = scriptResult.script.script || ''
      }
    } else {
      feedForm.script = ''
    }
  }
}

onMounted(async () => {
  await feedsStore.fetchCategories()
  await loadFeedData()
})
</script>

<style scoped>
.edit-feed-page {
  max-width: 1200px;
  margin: 0 auto;
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

.basic-info-card,
.script-card {
  margin-bottom: 20px;
}

.feed-form {
  max-width: 600px;
}

.action-buttons {
  margin-top: 30px;
  text-align: center;
  padding: 20px 0;
}

.action-buttons .el-button {
  margin: 0 10px;
  min-width: 120px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .edit-feed-page {
    padding: 10px;
  }
}
</style>