<template>
  <el-container style="height: 100vh">
    <el-aside :width="isCollapse ? '64px' : '220px'" style="transition: width 0.3s; background: #001529;">
      <div class="logo" :class="{ collapsed: isCollapse }">
        <el-icon :size="24" color="#409eff"><Monitor /></el-icon>
        <span v-show="!isCollapse">资产管理</span>
      </div>
      <el-menu :default-active="activeMenu" :collapse="isCollapse" background-color="#001529" text-color="#ffffffb3"
        active-text-color="#409eff" router unique-opened>
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon><template #title>仪表盘</template>
        </el-menu-item>
        <el-sub-menu index="asset-mgmt">
          <template #title><el-icon><Box /></el-icon><span>资产管理</span></template>
          <el-menu-item index="/assets">资产列表</el-menu-item>
          <el-menu-item index="/stock-in">入库登记</el-menu-item>
          <el-menu-item index="/stock-out">出库/借用</el-menu-item>
          <el-menu-item index="/return">归还登记</el-menu-item>
          <el-menu-item index="/records">出入库记录</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="system">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item index="/departments">部门管理</el-menu-item>
          <el-menu-item v-if="userStore.isSuperAdmin" index="/users">用户管理</el-menu-item>
          <el-menu-item v-if="userStore.isSuperAdmin" index="/config">系统配置</el-menu-item>
          <el-menu-item index="/logs">操作日志</el-menu-item>
          <el-menu-item index="/import">导入导出</el-menu-item>
          <el-menu-item v-if="userStore.isSuperAdmin" index="/backup">数据备份</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4e7ed;background:#fff;padding:0 20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <el-icon :size="20" style="cursor:pointer" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" /><Expand v-else />
          </el-icon>
          <el-breadcrumb>
            <el-breadcrumb-item>{{ $route.meta.title || '首页' }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <el-badge :value="notificationCount" :hidden="notificationCount === 0" :max="99">
            <el-icon :size="20" style="cursor:pointer" @click="$router.push('/dashboard')"><Bell /></el-icon>
          </el-badge>
          <el-dropdown @command="handleCommand">
            <span style="cursor:pointer;display:flex;align-items:center;gap:6px;">
              <el-avatar :size="32" style="background:#409eff">{{ userStore.userInfo?.realName?.[0] }}</el-avatar>
              <span>{{ userStore.userInfo?.realName }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main style="background: #f0f2f5; overflow-y: auto;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="showPasswordDialog" title="修改密码" width="400px">
    <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
      <el-form-item label="旧密码" prop="oldPassword">
        <el-input v-model="pwdForm.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="pwdForm.newPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showPasswordDialog = false">取消</el-button>
      <el-button type="primary" :loading="pwdLoading" @click="changePassword">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { authApi, dashboardApi } from '../api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)
const notificationCount = ref(0)
const activeMenu = computed(() => route.path)

const showPasswordDialog = ref(false)
const pwdFormRef = ref()
const pwdLoading = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码长度至少6位', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (_r: any, v: string, cb: Function) => v === pwdForm.newPassword ? cb() : cb(new Error('两次密码不一致')), trigger: 'blur' },
  ],
}

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (cmd === 'password') {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    showPasswordDialog.value = true
  }
}

async function changePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    await authApi.changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功')
    showPasswordDialog.value = false
  } catch { /* handled */ } finally { pwdLoading.value = false }
}

async function loadNotifications() {
  try {
    const { data } = await dashboardApi.notifications()
    notificationCount.value = (data.overdueBorrows?.length || 0) + (data.expiringBorrows?.length || 0) + (data.overduePickups?.length || 0)
  } catch { /* ignore */ }
}

onMounted(() => { loadNotifications() })
</script>

<style scoped>
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #ffffff1a;
}
.logo.collapsed span { display: none; }
.el-menu { border-right: none; }
</style>
