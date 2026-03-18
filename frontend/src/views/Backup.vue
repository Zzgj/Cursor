<template>
  <div>
    <div class="page-header">
      <h2>数据备份</h2>
      <el-button type="primary" :loading="backing" @click="doBackup"><el-icon><FolderAdd /></el-icon>立即备份</el-button>
    </div>
    <el-card shadow="hover">
      <el-table :data="backups" stripe border>
        <el-table-column prop="name" label="备份文件" />
        <el-table-column label="文件大小" width="140">
          <template #default="{ row }">{{ (row.size / 1024).toFixed(1) }} KB</template>
        </el-table-column>
        <el-table-column label="备份时间" width="200">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="download(row.name)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!backups.length" description="暂无备份" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { backupApi } from '../api'

const backups = ref<any[]>([])
const backing = ref(false)

async function load() {
  const { data } = await backupApi.list()
  backups.value = data
}

async function doBackup() {
  backing.value = true
  try {
    await backupApi.create()
    ElMessage.success('备份成功')
    load()
  } catch { /* handled */ } finally { backing.value = false }
}

async function download(name: string) {
  const { data } = await backupApi.download(name)
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>
