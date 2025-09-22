import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useScriptsStore = defineStore('scripts', () => {
  const scripts = ref([])
  const logs = ref([])
  const loading = ref(false)

  // 测试脚本
  const testScript = async (data) => {
    loading.value = true
    try {
      const response = await api.post('/scripts/test', {
        script: data.script,
        feedId: data.feedId,
        url: data.url
      })
      
      return response.data
    } catch (error) {
      console.error('测试脚本失败:', error)
      return { success: false, message: error.response?.data?.message || error.message }
    } finally {
      loading.value = false
    }
  }

  // 获取脚本执行日志
  const fetchLogs = async (feedId, params = {}) => {
    loading.value = true
    try {
      const response = await api.get(`/scripts/logs/${feedId}`, { params })
      logs.value = response.data.logs
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '获取日志失败'
      }
    } finally {
      loading.value = false
    }
  }

  // 获取脚本列表
  const fetchScripts = async () => {
    loading.value = true
    try {
      const response = await api.get('/scripts/')
      scripts.value = response.data.script
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '获取模板失败'
      }
    } finally {
      loading.value = false
    }
  }
  
  // 获取单个脚本
  const fetchScript = async (scriptId) => {
    loading.value = true
    try {
      const response = await api.get(`/scripts/${scriptId}`)
      return { success: true, script: response.data.script }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || '获取脚本失败'
      }
    } finally {
      loading.value = false
    }
  }
  
  // 保存脚本
  const saveScript = async (scriptData) => {
    loading.value = true
    try {
      // 如果有ID，则更新脚本
      if (scriptData.id) {
        const response = await api.put(`/scripts/${scriptData.id}`, scriptData)
        return { success: true, data: response.data.data }
      } 
      // 否则创建新脚本
      else {
        const response = await api.post('/scripts', scriptData)
        if (response.data.success) {
          return { success: true, data: response.data.data }
        } else {
          throw new Error(response.data.message)
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.message || '保存脚本失败'
      }
    } finally {
      loading.value = false
    }
  }

  // 更新脚本
  const updateScript = async (id, scriptData) => {
    loading.value = true
    try {
      const response = await api.put(`/scripts/${id}`, scriptData)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || '更新脚本失败')
    } finally {
      loading.value = false
    }
  }

  // 删除脚本
  const deleteScript = async (scriptId) => {
    loading.value = true
    try {
      await api.delete(`/scripts/${scriptId}`)
      return { success: true }
    } catch (error) {
      throw new Error(error.response?.data?.error || '删除脚本失败')
    } finally {
      loading.value = false
    }
  }

  return {
    scripts,
    logs,
    loading,
    testScript,
    fetchScripts,
    fetchScript,
    saveScript,
    fetchLogs,
    updateScript,
    deleteScript
  }
})