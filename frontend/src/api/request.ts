import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else if (err.response?.status === 409 && err.response?.data?.conflictType) {
      return Promise.reject(err)
    } else if (err.response?.data?.error) {
      ElMessage.error(err.response.data.error)
    } else {
      ElMessage.error('网络错误')
    }
    return Promise.reject(err)
  }
)

export default api
