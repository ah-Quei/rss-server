<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>个人资料</h2>
        </div>
      </template>
      
      <el-form :model="userForm" :rules="rules" ref="userFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" disabled></el-input>
        </el-form-item>
        
        <el-divider content-position="center">修改密码</el-divider>
        
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="userForm.currentPassword" type="password" show-password></el-input>
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="userForm.newPassword" type="password" show-password></el-input>
        </el-form-item>
        
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="userForm.confirmPassword" type="password" show-password></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="updatePassword" :loading="loading">更新密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const userFormRef = ref(null)
const loading = ref(false)

const userForm = reactive({
  username: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== userForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

onMounted(async () => {
  // 获取用户信息
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  
  userForm.username = authStore.user?.username || ''
  userForm.email = authStore.user?.email || ''
})

const updatePassword = async () => {
  if (!userFormRef.value) return
  
  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await authStore.updatePassword({
          currentPassword: userForm.currentPassword,
          newPassword: userForm.newPassword
        })
        
        ElMessage.success('密码更新成功')
        userForm.currentPassword = ''
        userForm.newPassword = ''
        userForm.confirmPassword = ''
      } catch (error) {
        ElMessage.error(error.message || '密码更新失败')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 20px auto;
}

.profile-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>