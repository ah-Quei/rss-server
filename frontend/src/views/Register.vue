<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1>RSS订阅服务</h1>
        <p>创建您的账户</p>
      </div>
      
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="邮箱"
            size="large"
            prefix-icon="Message"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="authStore.loading"
            class="register-button"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="register-footer">
        <span>已有账户？</span>
        <router-link to="/login" class="login-link">
          立即登录
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const registerFormRef = ref()
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      const { confirmPassword, ...userData } = registerForm
      const result = await authStore.register(userData)
      if (result.success) {
        ElMessage.success('注册成功')
        console.log('注册成功，准备跳转到首页')
        // 确保路由跳转生效
        setTimeout(() => {
          router.push({ path: '/' })
        }, 100)
      } else {
        ElMessage.error(result.message)
      }
    }
  })
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 600;
}

.register-header p {
  color: #666;
  margin: 0;
  font-size: 16px;
}

.register-form {
  margin-bottom: 20px;
}

.register-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.register-footer {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.login-link {
  color: #409eff;
  text-decoration: none;
  margin-left: 5px;
}

.login-link:hover {
  text-decoration: underline;
}
</style>