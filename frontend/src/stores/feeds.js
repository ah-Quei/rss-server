import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useFeedsStore = defineStore('feeds', () => {
  const feeds = ref([])
  const categories = ref([])
  const loading = ref(false)
  const currentFeed = ref(null)

  // 获取订阅源列表
  const fetchFeeds = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/feeds', { params })
      feeds.value = response.data.feeds
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '获取订阅源失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 创建订阅源
  const createFeed = async (feedData) => {
    loading.value = true
    try {
      // 确保发送的是scriptId而不是script内容
      const dataToSend = { ...feedData }
      delete dataToSend.script // 移除script字段，只发送scriptId
      
      const response = await api.post('/feeds', dataToSend)
      feeds.value.unshift(response.data.feed)
      return { success: true, feed: response.data.feed }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '创建订阅源失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 获取单个订阅源
  const fetchFeed = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/feeds/${id}`)
      currentFeed.value = response.data.feed
      return { success: true, feed: response.data.feed }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '获取订阅源失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 更新订阅源
  const updateFeed = async (id, feedData) => {
    loading.value = true
    try {
      // 确保发送的是scriptId而不是script内容
      const dataToSend = { ...feedData }
      delete dataToSend.script // 移除script字段，只发送scriptId
      
      const response = await api.put(`/feeds/${id}`, dataToSend)
      const updatedFeed = response.data.feed
      
      // 更新本地数据
      const index = feeds.value.findIndex(f => f.id === id)
      if (index !== -1) {
        feeds.value[index] = updatedFeed
      }
      
      if (currentFeed.value && currentFeed.value.id === id) {
        currentFeed.value = updatedFeed
      }
      
      return { success: true, feed: updatedFeed }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '更新订阅源失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 删除订阅源
  const deleteFeed = async (id) => {
    loading.value = true
    try {
      await api.delete(`/feeds/${id}`)
      
      // 从本地数据中移除
      feeds.value = feeds.value.filter(f => f.id !== id)
      
      if (currentFeed.value && currentFeed.value.id === id) {
        currentFeed.value = null
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '删除订阅源失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 刷新订阅源
  const refreshFeed = async (id) => {
    loading.value = true
    try {
      const response = await api.post(`/feeds/${id}/refresh`)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '刷新订阅源失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await api.get('/feeds/categories/list')
      categories.value = response.data.categories
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '获取分类失败' 
      }
    }
  }

  // 验证RSS URL
  const validateRssUrl = async (url) => {
    try {
      const response = await api.get(`/feeds/validate?url=${encodeURIComponent(url)}`)
      return { 
        success: true, 
        message: response.data.message || 'RSS源验证成功' 
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '无效的RSS URL或无法访问' 
      }
    }
  }

  return {
    feeds,
    categories,
    loading,
    currentFeed,
    fetchFeeds,
    createFeed,
    fetchFeed,
    updateFeed,
    deleteFeed,
    refreshFeed,
    fetchCategories,
    validateRssUrl
  }
})