import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => ['super_admin', 'admin'].includes(userInfo.value?.role))
  const isSuperAdmin = computed(() => userInfo.value?.role === 'super_admin')

  function setLogin(t: string, user: any) {
    token.value = t
    userInfo.value = user
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(user))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, userInfo, isLoggedIn, isAdmin, isSuperAdmin, setLogin, logout }
})
