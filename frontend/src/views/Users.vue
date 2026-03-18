<template>
  <div>
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增用户</el-button>
    </div>
    <el-table :data="users" stripe border>
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="realName" label="姓名" width="150" />
      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag size="small">{{ ROLE_MAP[row.role] || row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="warning" @click="resetPwd(row)">重置密码</el-button>
          <el-button link :type="row.isActive ? 'danger' : 'success'" @click="toggleActive(row)">{{ row.isActive ? '停用' : '启用' }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑用户' : '新增用户'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="密码" required>
          <el-input v-model="form.password" type="password" show-password placeholder="初始密码" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="form.realName" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option v-for="(v, k) in ROLE_MAP" :key="k" :label="v" :value="k" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '../api'
import { ROLE_MAP } from '../utils/constants'

const users = ref<any[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ username: '', password: '', realName: '', role: 'admin' })

async function load() {
  const { data } = await userApi.list()
  users.value = data
}

function openDialog(user?: any) {
  if (user) {
    editingId.value = user.id
    form.username = user.username
    form.realName = user.realName
    form.role = user.role
    form.password = ''
  } else {
    editingId.value = null
    form.username = ''
    form.password = '123456'
    form.realName = ''
    form.role = 'admin'
  }
  dialogVisible.value = true
}

async function save() {
  if (!form.username || !form.realName) { ElMessage.warning('用户名和姓名不能为空'); return }
  if (editingId.value) {
    await userApi.update(editingId.value, { realName: form.realName, role: form.role })
  } else {
    if (!form.password) { ElMessage.warning('密码不能为空'); return }
    await userApi.create(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function resetPwd(user: any) {
  await ElMessageBox.confirm(`将 ${user.realName} 的密码重置为 123456？`, '重置密码', { type: 'warning' })
  await userApi.resetPassword(user.id, '123456')
  ElMessage.success('密码已重置为 123456')
}

async function toggleActive(user: any) {
  await userApi.update(user.id, { isActive: !user.isActive })
  ElMessage.success(user.isActive ? '已停用' : '已启用')
  load()
}

onMounted(load)
</script>
