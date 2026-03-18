<template>
  <div>
    <div class="page-header">
      <h2>部门管理</h2>
      <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增部门</el-button>
    </div>
    <el-table :data="departments" stripe border>
      <el-table-column prop="name" label="部门名称" />
      <el-table-column prop="sortOrder" label="排序" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link :type="row.isActive ? 'warning' : 'success'" @click="toggleActive(row)">{{ row.isActive ? '停用' : '启用' }}</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑部门' : '新增部门'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="部门名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sortOrder" :min="0" />
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
import { departmentApi } from '../api'

const departments = ref<any[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ name: '', sortOrder: 0 })

async function load() {
  const { data } = await departmentApi.list()
  departments.value = data
}

function openDialog(dept?: any) {
  if (dept) {
    editingId.value = dept.id
    form.name = dept.name
    form.sortOrder = dept.sortOrder
  } else {
    editingId.value = null
    form.name = ''
    form.sortOrder = 0
  }
  dialogVisible.value = true
}

async function save() {
  if (!form.name.trim()) { ElMessage.warning('名称不能为空'); return }
  if (editingId.value) {
    await departmentApi.update(editingId.value, form)
  } else {
    await departmentApi.create(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

async function toggleActive(dept: any) {
  await departmentApi.update(dept.id, { isActive: !dept.isActive })
  ElMessage.success(dept.isActive ? '已停用' : '已启用')
  load()
}

async function handleDelete(dept: any) {
  await ElMessageBox.confirm(`确认删除部门「${dept.name}」？`, '确认删除', { type: 'warning' })
  try {
    await departmentApi.delete(dept.id)
    ElMessage.success('删除成功')
    load()
  } catch { /* handled */ }
}

onMounted(load)
</script>
