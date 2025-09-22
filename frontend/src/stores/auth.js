import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  // 登录
  const login = async (credentials) => {
    loading.value = true
    try {
      const response = await api.post('/auth/login', credentials)
      const { token: newToken, user: userData } = response.data
      
      token.value = newToken
      user.value = userData
      localStorage.setItem('token', newToken)
      
      // 设置axios默认header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '登录失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 注册
  const register = async (userData) => {
    loading.value = true
    try {
      const response = await api.post('/auth/register', userData)
      const { token: newToken, user: newUser } = response.data
      
      token.value = newToken
      user.value = newUser
      localStorage.setItem('token', newToken)
      
      // 设置axios默认header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '注册失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 获取用户信息
  const fetchUser = async () => {
    if (!token.value) return
    
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
    } catch (error) {
      console.error('获取用户信息失败:', error)
      logout()
    }
  }

  // 登出
  const logout = () => {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  // 更新密码
  const updatePassword = async (passwordData) => {
    loading.value = true
    try {
      await api.put('/auth/password', passwordData)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || '密码更新失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 初始化时设置token
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    fetchUser()
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser,
    updatePassword
  }
})