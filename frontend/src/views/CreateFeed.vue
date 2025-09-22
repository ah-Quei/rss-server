<template>
  <div class="create-feed-page">
    <div class="page-header">
      <h1>添加订阅源</h1>
      <p>添加新的RSS订阅源</p>
    </div>

    <el-card>
      <el-form ref="feedFormRef" :model="feedForm" :rules="feedRules" label-width="100px" class="feed-form">
        <el-form-item label="标题" prop="title">
          <el-input v-model="feedForm.title" placeholder="请输入订阅源标题" maxlength="255" show-word-limit />
        </el-form-item>

        <el-form-item label="RSS URL" prop="url">
          <el-input v-model="feedForm.url" placeholder="请输入RSS订阅地址">
            <template #append>
              <el-button :loading="validating" @click="validateUrl">
                验证
              </el-button>
            </template>
          </el-input>
          <div v-if="urlValidation.message" class="url-validation">
            <el-text :type="urlValidation.success ? 'success' : 'danger'" size="small">
              {{ urlValidation.message }}
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="feedForm.category" placeholder="选择或输入分类" filterable allow-create default-first-option>
            <el-option v-for="category in feedsStore.categories" :key="category" :label="category" :value="category" />
          </el-select>
        </el-form-item>

        <el-form-item label="刷新频率" prop="refreshInterval">
          <el-select v-model="feedForm.refreshInterval" placeholder="选择刷新频率">
            <el-option label="15分钟" :value="15" />
            <el-option label="30分钟" :value="30" />
            <el-option label="1小时" :value="60" />
            <el-option label="2小时" :value="120" />
            <el-option label="6小时" :value="360" />
            <el-option label="12小时" :value="720" />
            <el-option label="24小时" :value="1440" />
          </el-select>
          <div class="refresh-interval-hint">
            <el-text size="small" type="info">
              设置订阅源的自动刷新频率，默认为1小时
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="处理脚本">
          <ScriptEditor v-model="feedForm.script" title="" description="为新订阅源配置处理脚本（可选）" :show-header="false"
            :allow-none="true" :show-save-button="false" :show-test-button="true" :show-test-results="true"
            :test-url="feedForm.url" editor-height="300px" @test-success="handleTestSuccess"
            @test-error="handleTestError" @template-change="handleTemplateChange" ref="scriptEditorRef" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="feedsStore.loading" @click="handleSubmit">
            创建订阅源
          </el-button>
          <el-button @click="$router.back()">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 脚本模板对话框 -->
    <el-dialog v-model="showTemplates" title="脚本模板" width="800px">
      <div class="templates-list">
        <div v-for="template in scriptsStore.scripts" :key="template.name" class="template-item">
          <div class="template-header">
            <h4>{{ template.name }}</h4>
            <el-button type="primary" size="small" @click="useTemplate(template)">
              使用模板
            </el-button>
          </div>
          <p class="template-description">{{ template.description }}</p>
          <pre class="template-code">{{ template.script }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFeedsStore } from '@/stores/feeds'
import { useScriptsStore } from '@/stores/scripts'
import ScriptEditor from '@/components/ScriptEditor.vue'
import api from '@/api'

const router = useRouter()
const feedsStore = useFeedsStore()
const scriptsStore = useScriptsStore()

const feedFormRef = ref()
const scriptEditorRef = ref()

const feedForm = reactive({
  title: '',
  url: '',
  category: '',
  refreshInterval: 60,
  scriptId: null,
  script: ''
})

const feedRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入RSS URL', trigger: 'blur' },
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' }
  ]
}

const validating = ref(false)
const showTemplates = ref(false)
const loading = ref(false)
const selectedTemplate = ref('custom')

const urlValidation = ref({
  success: false,
  message: ''
})

// 验证RSS URL
const validateUrl = async () => {
  if (!feedForm.url) return

  validating.value = true
  urlValidation.value = { success: false, message: '' }

  try {
    // 使用store方法验证RSS URL
    const result = await feedsStore.validateRssUrl(feedForm.url)
    
    if (result.success) {
      urlValidation.value = {
        success: true,
        message: result.message
      }
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    console.error('验证RSS URL失败:', error)
    urlValidation.value = {
      success: false,
      message: error.message || 'RSS源验证失败，请检查URL是否正确'
    }
  } finally {
    validating.value = false
  }
}

// 处理模板选择变更
const handleTemplateChange = (template) => {
  // 保存当前选择的模板
  selectedTemplate.value = template.id
}

// 处理测试成功
const handleTestSuccess = (result) => {
  console.log('Script test success:', result)
}

// 处理测试失败
const handleTestError = (error) => {
  console.error('Script test failed:', error)
}

// 提交表单
const handleSubmit = async () => {

  console.log('handleSubmit');

  if (!feedFormRef.value) return

  await feedFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 获取ScriptEditor组件中的脚本内容
        if (scriptEditorRef.value) {
          feedForm.script = scriptEditorRef.value.getScript()
        }

        // 处理脚本逻辑
        // 获取当前选择的模板信息
        const currentTemplate = scriptEditorRef.value.getSelectedTemplate();

        // 如果选择"不使用脚本"
        if (currentTemplate.id === 'none') {
          feedForm.scriptId = null;
          feedForm.script = '';
        }
        // 如果选择了系统模板且内容未修改
        else if (currentTemplate.id !== 'custom' &&
          currentTemplate.id !== 'none' &&
          currentTemplate.script === feedForm.script) {
          // 直接使用模板ID，不保存新脚本
          feedForm.scriptId = currentTemplate.id;
          feedForm.script = currentTemplate.script;
        }
        // 如果是自定义脚本或修改了模板内容
  else if (feedForm.script && feedForm.script.trim()) {
    // 保存自定义脚本
    try {
      // 弹窗让用户输入脚本名称
      const { value: scriptName } = await ElMessageBox.prompt(
        '请输入脚本名称', 
        '保存脚本', 
        {
          confirmButtonText: '保存',
          cancelButtonText: '取消',
          inputPattern: /^.{1,50}$/,
          inputErrorMessage: '脚本名称长度应在1-50个字符之间',
          inputValue: `${feedForm.title} 的自定义脚本`
        }
      );

      // 弹窗让用户输入脚本描述
      const { value: scriptDescription } = await ElMessageBox.prompt(
        '请输入脚本描述（可选）', 
        '保存脚本', 
        {
          confirmButtonText: '保存',
          cancelButtonText: '取消',
          inputValue: currentTemplate.id !== 'custom' ? `基于模板 "${currentTemplate.name}" 修改` : '自定义脚本',
          required: false
        }
      );

      // 保存脚本
      const scriptResult = await scriptsStore.saveScript({
        name: scriptName,
        description: scriptDescription || '',
        script: feedForm.script,
        is_template: 0
      });
      
      if (scriptResult.success) {
        feedForm.scriptId = scriptResult.data.id;
      } else {
        ElMessage.error('保存脚本失败: ' + scriptResult.message);
        loading.value = false;
        return;
      }
    } catch (error) {
      // 用户可能取消了操作
      if (error === 'cancel' || error.message === 'cancel') {
        ElMessage.warning('未保存脚本，订阅源将不关联脚本');
        feedForm.scriptId = null;
      } else {
        ElMessage.error('保存脚本失败: ' + (error.message || '未知错误'));
        loading.value = false;
        return;
      }
    }
  } else {
    feedForm.scriptId = null;
    feedForm.script = '';
  }

        const result = await feedsStore.createFeed(feedForm)
        if (result.success) {
          ElMessage.success('订阅源创建成功')
          router.push('/feeds')
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        console.error('创建订阅源失败:', error)
        ElMessage.error('创建订阅源失败')
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(async () => {
  // 获取分类列表和脚本模板
  await Promise.all([
    feedsStore.fetchCategories(),
    scriptsStore.fetchScripts()
  ])
})
</script>

<style scoped>
.create-feed-page {
  max-width: 800px;
  margin: 0 auto;
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

.feed-form {
  max-width: 600px;
}

.url-validation {
  margin-top: 5px;
}

.refresh-interval-hint {
  margin-top: 5px;
}

.templates-list {
  max-height: 500px;
  overflow-y: auto;
}

.template-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.template-header h4 {
  margin: 0;
  color: #303133;
}

.template-description {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

.template-code {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin: 0;
}
</style>