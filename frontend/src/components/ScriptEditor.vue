<template>
  <div class="script-editor">
    <!-- 脚本配置头部 -->
    <div class="script-header" v-if="showHeader">
      <div class="header-left">
        <span class="header-title">{{ title }}</span>
        <el-text v-if="description" size="small" type="info">{{ description }}</el-text>
      </div>
      <div class="header-actions">
        <el-select 
          v-model="selectedTemplate" 
          placeholder="选择模板" 
          @change="handleTemplateChange"
          style="width: 180px; margin-right: 10px;" 
          value-key="id"
        >
          <el-option 
            v-if="allowNone" 
            label="不使用脚本" 
            :value="{ id: 'none', name: '不使用脚本' }" 
          />
          <el-option 
            label="自定义脚本" 
            :value="{ id: 'custom', name: '自定义脚本' }" 
          />
          <el-option-group label="我的脚本" v-if="customScripts.length > 0">
            <el-option 
              v-for="script in customScripts" 
              :key="script.id" 
              :label="script.name"
              :value="script" 
            />
          </el-option-group>
          <el-option-group label="系统模板" v-if="systemScripts.length > 0">
            <el-option 
              v-for="template in systemScripts" 
              :key="template.id" 
              :label="template.name"
              :value="template" 
            />
          </el-option-group>
        </el-select>
        
        <el-button 
          v-if="showSaveButton"
          type="success" 
          @click="saveScript" 
          :disabled="!scriptContent.trim()"
          style="margin-right: 10px;"
        >
          <el-icon><DocumentAdd /></el-icon>
          保存脚本
        </el-button>
        
        <el-button 
          v-if="showDeleteButton"
          type="danger" 
          @click="deleteScript" 
          style="margin-right: 10px;"
          :disabled="!selectedTemplate || selectedTemplate.is_template === 1 || selectedTemplate.id === 'custom' || selectedTemplate.id === 'none'"
        >
          <el-icon><Delete /></el-icon>
          删除脚本
        </el-button>
        
        <el-button 
          v-if="showTestButton"
          type="primary" 
          @click="testScript" 
          :loading="testing"
          :disabled="!canTest"
        >
          <el-icon><VideoPlay /></el-icon>
          测试脚本
        </el-button>
      </div>
    </div>
    
    <!-- 简化的控制栏（当不显示头部时） -->
    <div class="script-controls" v-else>
      <div class="controls-row">
        <el-text v-if="description" size="small" type="info" style="margin-bottom: 8px; display: block;">{{ description }}</el-text>
        <div class="controls-actions">
          <el-select 
            v-model="selectedTemplate" 
            placeholder="选择脚本模板" 
            @change="handleTemplateChange"
            style="width: 200px; margin-right: 10px;" 
            value-key="id"
          >
            <el-option 
              v-if="allowNone" 
              label="不使用脚本" 
              :value="{ id: 'none', name: '不使用脚本' }" 
            />
            <el-option 
              label="自定义脚本" 
              :value="{ id: 'custom', name: '自定义脚本' }" 
            />
            <el-option-group label="我的脚本" v-if="customScripts.length > 0">
              <el-option 
                v-for="script in customScripts" 
                :key="script.id" 
                :label="script.name"
                :value="script" 
              />
            </el-option-group>
            <el-option-group label="系统模板" v-if="systemScripts.length > 0">
              <el-option 
                v-for="template in systemScripts" 
                :key="template.id" 
                :label="template.name"
                :value="template" 
              />
            </el-option-group>
          </el-select>
          
          <el-button 
            v-if="showSaveButton"
            type="success" 
            @click="saveScript" 
            :disabled="!scriptContent.trim()"
            style="margin-right: 10px;"
          >
            <el-icon><DocumentAdd /></el-icon>
            保存脚本
          </el-button>
          
          <el-button 
            v-if="showTestButton"
            type="primary" 
            @click="testScript" 
            :loading="testing"
            :disabled="!canTest"
          >
            <el-icon><VideoPlay /></el-icon>
            测试脚本
          </el-button>
        </div>
      </div>
    </div>

    <!-- 无脚本提示 -->
    <div v-if="selectedTemplate.id === 'none'" class="no-script-info">
      <el-alert 
        title="不使用脚本" 
        type="info" 
        :closable="false" 
        show-icon
      >
        <p>选择此选项将不对RSS文章进行任何脚本处理，所有文章将直接保存。</p>
      </el-alert>
    </div>

    <!-- 编辑器区域 -->
    <div v-else>
      <div ref="editorContainer" class="editor-container"></div>
      
      <!-- 脚本说明 -->
      <div class="script-info" v-if="selectedTemplate && selectedTemplate.id !== 'custom' && selectedTemplate.id !== 'none'">
        <h3>{{ selectedTemplate.name }}</h3>
        <p>{{ selectedTemplate.description }}</p>
        <p v-if="selectedTemplate.createdAt" class="script-meta">
          <el-tag size="small" type="info">
            创建时间: {{ new Date(selectedTemplate.createdAt).toLocaleString() }}
          </el-tag>
        </p>
      </div>
      <div class="script-info" v-else-if="selectedTemplate.id === 'custom'">
        <h3>自定义脚本</h3>
        <p>创建自定义脚本来处理RSS文章。脚本必须包含一个名为 <code>processArticle</code> 的函数。</p>
        <el-alert title="脚本API参考" type="info" :closable="false" show-icon>
          <p><strong>processArticle(article, rawItem)</strong> - 处理单个文章</p>
          <ul>
            <li><strong>article</strong>: 文章对象，包含 title, link, description, pub_date 等字段</li>
            <li><strong>rawItem</strong>: 原始RSS项目，包含 categories, creator, enclosure 等字段</li>
          </ul>
          <p><strong>返回值</strong>: 必须返回包含 action 字段的对象</p>
          <ul>
            <li><strong>{ action: 'keep', article }</strong> - 保留文章</li>
            <li><strong>{ action: 'filter', reason }</strong> - 过滤文章</li>
            <li><strong>{ action: 'webhook', article, webhook }</strong> - 触发Webhook</li>
          </ul>
        </el-alert>
      </div>
    </div>

    <!-- 测试结果 -->
    <div v-if="showTestResults && testResults.length > 0" class="test-results">
      <h3>测试结果</h3>
      <div v-for="(result, index) in testResults" :key="index" class="test-result-item">
        <div v-if="result.success" class="result-success">
          <div v-if="result.result.action === 'keep'">
            <p><strong>操作：</strong> 保留文章</p>
            <div class="article-preview">
              <p><strong>标题：</strong> {{ result.result.article.title }}</p>
              <p><strong>链接：</strong> 
                <a :href="result.result.article.link" target="_blank">{{ result.result.article.link }}</a>
              </p>
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentAdd, VideoPlay, Delete } from '@element-plus/icons-vue'
import { useScriptsStore } from '@/stores/scripts'
import * as monaco from 'monaco-editor'

const props = defineProps({
  // 脚本内容
  modelValue: {
    type: String,
    default: ''
  },
  // 组件标题
  title: {
    type: String,
    default: '脚本编辑器'
  },
  // 描述文本
  description: {
    type: String,
    default: ''
  },
  // 是否显示头部
  showHeader: {
    type: Boolean,
    default: true
  },
  // 是否允许选择"不使用脚本"
  allowNone: {
    type: Boolean,
    default: false
  },
  // 是否显示保存按钮
  showSaveButton: {
    type: Boolean,
    default: false
  },
  // 是否显示测试按钮
  showTestButton: {
    type: Boolean,
    default: true
  },
  // 是否显示测试结果
  showTestResults: {
    type: Boolean,
    default: true
  },
  // 是否显示删除按钮
  showDeleteButton: {
    type: Boolean,
    default: false
  },
  // 编辑器高度
  editorHeight: {
    type: String,
    default: '300px'
  },
  // 测试用的订阅源ID（用于EditFeed页面）
  feedId: {
    type: [String, Number],
    default: null
  },
  // 测试用的URL（用于CreateFeed页面）
  testUrl: {
    type: String,
    default: ''
  },
  // 是否正在测试
  testing: {
    type: Boolean,
    default: false
  },
  // 初始选中的脚本ID
  initialScriptId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'test-success', 'test-error', 'save-success', 'save-error', 'template-change', 'script-selected', 'delete-success', 'delete-error'])

const scriptsStore = useScriptsStore()

const editorContainer = ref()
const scriptContent = ref(props.modelValue)
const selectedTemplate = ref(props.allowNone ? { id: 'none', name: '不使用脚本' } : { id: 'custom', name: '自定义脚本' })
const customScripts = ref([])
const systemScripts = ref([])
const testResults = ref([])
let editor = null

// 计算是否可以测试
const canTest = computed(() => {
  return selectedTemplate.value.id !== 'none' && scriptContent.value.trim()
})

// 初始化Monaco编辑器
const initEditor = () => {
  // 确保先清空容器内容，避免重复初始化问题
  if (editorContainer.value) {
    editorContainer.value.innerHTML = '';
  }
  
  if (editorContainer.value && selectedTemplate.value.id !== 'none') {
    try {
      // 确保先销毁旧编辑器
      disposeEditor();
      
      editor = monaco.editor.create(editorContainer.value, {
        value: scriptContent.value || '',
        language: 'javascript',
        theme: 'vs-dark',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        automaticLayout: true
      })
      
      // 监听编辑器内容变化
      editor.onDidChangeModelContent(() => {
        const value = editor.getValue()
        scriptContent.value = value
        emit('update:modelValue', value)
        emit('change', value)
      })
    } catch (error) {
      console.error('初始化编辑器失败:', error);
    }
  }
}

// 销毁编辑器
const disposeEditor = () => {
  if (editor) {
    try {
      editor.dispose()
    } catch (error) {
      console.error('销毁编辑器失败:', error);
    } finally {
      editor = null
    }
  }
}

// 处理模板选择变更
const handleTemplateChange = () => {
  
  let newContent = ''
  
  if (selectedTemplate.value.id === 'none') {
    newContent = ''
    // 如果选择"不使用脚本"，需要销毁编辑器
    disposeEditor()
    // 发送选中的脚本对象为null
    emit('script-selected', null)
  } else if (selectedTemplate.value.id === 'custom') {
    newContent = `// 在此编写您的脚本\nfunction processArticle(article, rawItem) {\n  // 示例：保留所有文章\n  return {\n    action: 'keep',\n    article: article\n  };\n}`
    // 发送选中的脚本对象为null
    emit('script-selected', null)
  } else if (selectedTemplate.value && selectedTemplate.value.script) {
    newContent = selectedTemplate.value.script
    // 发送选中的脚本对象
    emit('script-selected', selectedTemplate.value)
  }
  
  // 更新内容
  scriptContent.value = newContent
  emit('update:modelValue', newContent)
  emit('change', newContent)
  
  // 处理编辑器
  if (selectedTemplate.value.id === 'none') {
    // 如果选择"不使用脚本"，确保编辑器被销毁
    disposeEditor()
  } else {
    // 对于其他情况，总是重新初始化编辑器
    // 确保先销毁旧编辑器，避免重复初始化错误
    disposeEditor()
    // 延迟初始化以确保DOM更新完成
    setTimeout(() => {
      initEditor()
    }, 100)
  }
  
  // 发送模板变更事件
  emit('template-change', selectedTemplate.value)
}

// 测试脚本
const testScript = async () => {
  if (!canTest.value) return
  
  try {
    const result = await scriptsStore.testScript({
      script: scriptContent.value,
      feedId: props.feedId,
      url: props.testUrl // 用于CreateFeed页面的URL测试
    })
    
    if (result.success) {
      if (props.showTestResults) {
        testResults.value = result.results || []
      }
      ElMessage.success('脚本测试完成')
      emit('test-success', result)
    } else {
      ElMessage.error(result.message || '脚本测试失败')
      emit('test-error', result)
    }
    
    return result
  } catch (error) {
    const errorMsg = '脚本测试失败'
    ElMessage.error(errorMsg)
    emit('test-error', { success: false, message: errorMsg })
    return { success: false, message: errorMsg }
  }
}

// 保存脚本
const saveScript = async () => {
  if (!scriptContent.value.trim()) {
    ElMessage.warning('脚本内容不能为空')
    return
  }
  
  // 检查当前选择的脚本
  const currentScript = selectedTemplate.value
  const isEditing = currentScript && currentScript.id !== 'custom' && currentScript.id > 0
  const isSystemTemplate = currentScript && currentScript.id < 0
  
  try {
    // 如果是系统模板，不允许修改
    if (isSystemTemplate) {
      ElMessage.warning('系统模板不允许修改，请选择自定义脚本或其他用户脚本')
      return
    }

    const { value: scriptName } = await ElMessageBox.prompt(
      '请输入脚本名称', 
      isEditing ? '修改脚本' : '保存脚本', 
      {
        confirmButtonText: isEditing ? '修改' : '保存',
        cancelButtonText: '取消',
        inputPattern: /^.{1,50}$/,
        inputErrorMessage: '脚本名称长度应在1-50个字符之间',
        inputValue: isEditing ? currentScript.name : ''
      }
    )

    const { value: scriptDescription } = await ElMessageBox.prompt(
      '请输入脚本描述（可选）', 
      isEditing ? '修改脚本' : '保存脚本', 
      {
        confirmButtonText: isEditing ? '修改' : '保存',
        cancelButtonText: '取消',
        inputValue: isEditing ? currentScript.description : '',
        required: false
      }
    )

    // 执行保存操作
    let result
    if (isEditing) {
      result = await scriptsStore.updateScript(currentScript.id, {
        name: scriptName,
        description: scriptDescription || '',
        script: scriptContent.value
      })
    } else {
      result = await scriptsStore.saveScript({
        name: scriptName,
        description: scriptDescription || '',
        script: scriptContent.value
      })
    }

    ElMessage.success(isEditing ? '脚本修改成功' : '脚本保存成功')
    
    // 重新加载脚本列表
    await loadScripts()
    
    // 如果是新保存的脚本，自动选中它
    if (!isEditing && result) {
      selectedTemplate.value = result
    }
    
    emit('save-success', {
      script: result,
      isEditing
    })
    
    return result
  } catch (error) {
    if (error.message && error.message !== 'cancel') {
      ElMessage.error(error.message)
      emit('save-error', error)
    }
    // 用户取消了操作或其他错误
  }
}

// 删除脚本
const deleteScript = async () => {
  if (!selectedTemplate.value || selectedTemplate.value.id === 'custom' || selectedTemplate.value.id === 'none') {
    return
  }
  
  try {
    // 确认删除
    await ElMessageBox.confirm(
      '确定要删除脚本"' + selectedTemplate.value.name + '"吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 执行删除
    const result = await scriptsStore.deleteScript(selectedTemplate.value.id)
    
    ElMessage.success('脚本删除成功')
    
    // 重新加载脚本列表
    await loadScripts()
    
    // 重置为自定义脚本
    scriptContent.value = '// 在此编写您的脚本\nfunction processArticle(article, rawItem) {\n  // 示例：保留所有文章\n  return {\n    action: \'keep\',\n    article: article\n  };\n}'
    selectedTemplate.value = { id: 'custom', name: '自定义脚本' }
    emit('update:modelValue', scriptContent.value)
    
    emit('delete-success', { message: '脚本删除成功' })
    
    return result
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除脚本失败')
      emit('delete-error', error)
    }
    // 用户取消了操作
  }
}

// 加载脚本模板
const loadScripts = async () => {
  await scriptsStore.fetchScripts()  
  
  customScripts.value = []
  systemScripts.value = []
  
  scriptsStore.scripts.forEach((script) => {
    if (!script.is_template) {
      customScripts.value.push(script)
    } else {
      systemScripts.value.push(script)
    }
  })
}

// 设置脚本内容（外部调用）
const setScript = (script, template = null) => {
  scriptContent.value = script
  if (template) {
    selectedTemplate.value = template
  }
  if (editor) {
    editor.setValue(script)
  }
}

// 设置测试结果（外部调用）
const setTestResults = (results) => {
  testResults.value = results
}

// 监听外部传入的脚本内容变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== scriptContent.value) {
    scriptContent.value = newValue
    if (editor) {
      editor.setValue(newValue)
    }
  }
})

// 监听选中模板变化，重新初始化编辑器
watch(() => selectedTemplate.value.id, () => {
  setTimeout(() => {
    if (selectedTemplate.value.id !== 'none') {
      disposeEditor()
      initEditor()
    } else {
      disposeEditor()
    }
  }, 100)
})

// 监听initialScriptId属性变化，当父组件异步加载数据后更新
watch(() => props.initialScriptId, (newScriptId) => {
  if (newScriptId) {
    // 查找对应的脚本
    const allScripts = [...customScripts.value, ...systemScripts.value]
    const scriptToSelect = allScripts.find(s => s.id === newScriptId)
    
    if (scriptToSelect && selectedTemplate.value.id !== scriptToSelect.id) {
      selectedTemplate.value = scriptToSelect
      // 手动触发模板变更处理
      handleTemplateChange()
    }
  } else if (props.allowNone && selectedTemplate.value.id !== 'none') {
    // 如果没有脚本ID且允许不使用脚本，则选择"不使用脚本"
    selectedTemplate.value = { id: 'none', name: '不使用脚本' }
    // 手动触发模板变更处理
    handleTemplateChange()
  }
}, { immediate: true })

onMounted(async () => {
  await loadScripts()
  
  // 初始化编辑器
  setTimeout(() => {
    initEditor()
  }, 100)
})

onUnmounted(() => {
  disposeEditor()
})

// 暴露方法给父组件
defineExpose({
  setScript,
  setTestResults,
  saveScript,
  getScript: () => scriptContent.value,
  getSelectedTemplate: () => selectedTemplate.value
})
</script>

<style scoped>
.script-editor {
  width: 100%;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.script-controls {
  margin-bottom: 16px;
}

.controls-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.controls-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.no-script-info {
  margin: 16px 0;
}

.editor-container {
  height: v-bind(editorHeight);
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.script-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 16px;
  margin-top: 16px;
}

.script-info h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 16px;
}

.script-info p {
  margin: 8px 0;
  color: #606266;
  line-height: 1.5;
}

.script-info code {
  background: #f1f2f3;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
}

.script-info ul {
  margin: 8px 0;
  padding-left: 20px;
}

.script-info li {
  margin: 4px 0;
  color: #606266;
}

.script-meta {
  margin-top: 12px;
}

.test-results {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
}

.test-results h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.test-result-item {
  background: white;
  border: 1px solid #e4e7ed;
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
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
}

.article-preview p {
  margin: 4px 0;
  font-size: 14px;
}

.truncated-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .script-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .header-actions .el-select {
    width: 100% !important;
    margin-right: 0 !important;
    margin-bottom: 8px;
  }
  
  .controls-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .controls-actions .el-select {
    width: 100% !important;
    margin-right: 0 !important;
  }
}
</style>