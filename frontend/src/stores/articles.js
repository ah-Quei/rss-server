import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref([])
  const stats = ref({})
  const loading = ref(false)
  const currentArticle = ref(null)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)

  // 获取文章列表
  const fetchArticles = async (params = {}) => {
    loading.value = true
    try {
      // 合并分页参数
      const requestParams = {
        page: currentPage.value,
        limit: pageSize.value,
        ...params
      }
      
      const response = await api.get('/articles', { params: requestParams })
      articles.value = response.data.articles
      total.value = response.data.total
      currentPage.value = response.data.page
      pageSize.value = response.data.limit
      
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '获取文章失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 获取单篇文章
  const fetchArticle = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/articles/${id}`)
      currentArticle.value = response.data.article
      return { success: true, article: response.data.article }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '获取文章失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 标记文章为已读
  const markAsRead = async (id) => {
    try {
      await api.put(`/articles/${id}/read`)
      
      // 更新本地数据
      const article = articles.value.find(a => a.id === id)
      if (article) {
        article.is_read = true
      }
      
      if (currentArticle.value && currentArticle.value.id === id) {
        currentArticle.value.is_read = true
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '标记已读失败' 
      }
    }
  }

  // 标记文章为未读
  const markAsUnread = async (id) => {
    try {
      await api.put(`/articles/${id}/unread`)
      
      // 更新本地数据
      const article = articles.value.find(a => a.id === id)
      if (article) {
        article.is_read = false
      }
      
      if (currentArticle.value && currentArticle.value.id === id) {
        currentArticle.value.is_read = false
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '标记未读失败' 
      }
    }
  }

  // 批量标记为已读
  const batchMarkAsRead = async (articleIds) => {
    try {
      await api.put('/articles/batch/read', { articleIds })
      
      // 更新本地数据
      articles.value.forEach(article => {
        if (articleIds.includes(article.id)) {
          article.is_read = true
        }
      })
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '批量标记失败' 
      }
    }
  }

  // 删除文章
  const deleteArticle = async (id) => {
    try {
      await api.delete(`/articles/${id}`)
      
      // 从本地数据中移除
      articles.value = articles.value.filter(a => a.id !== id)
      
      if (currentArticle.value && currentArticle.value.id === id) {
        currentArticle.value = null
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '删除文章失败' 
      }
    }
  }

  // 获取文章统计
  const fetchStats = async () => {
    try {
      const response = await api.get('/articles/stats/summary')
      stats.value = response.data.stats
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '获取统计失败' 
      }
    }
  }

  return {
    articles,
    stats,
    loading,
    currentArticle,
    total,
    currentPage,
    pageSize,
    fetchArticles,
    fetchArticle,
    markAsRead,
    markAsUnread,
    batchMarkAsRead,
    deleteArticle,
    fetchStats
  }
})