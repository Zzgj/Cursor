<template>
  <div>
    <div class="page-header">
      <h2>操作日志</h2>
    </div>
    <div class="filter-bar">
      <el-input v-model="actionFilter" placeholder="操作类型" clearable style="width:200px" @keyup.enter="load" />
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" @change="load" />
      <el-button @click="load"><el-icon><Refresh /></el-icon>刷新</el-button>
    </div>
    <el-table :data="logs" stripe border>
      <el-table-column label="操作人" width="120">
        <template #default="{ row }">{{ row.operator?.realName }}</template>
      </el-table-column>
      <el-table-column prop="action" label="操作" width="160" />
      <el-table-column prop="targetType" label="对象类型" width="100" />
      <el-table-column prop="targetId" label="对象ID" width="80" />
      <el-table-column label="详情" show-overflow-tooltip>
        <template #default="{ row }">{{ row.detail }}</template>
      </el-table-column>
      <el-table-column prop="ipAddress" label="IP" width="130" />
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
      </el-table-column>
    </el-table>
    <div style="display:flex;justify-content:flex-end;margin-top:16px;">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
        :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="load" @size-change="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { logApi } from '../api'

const logs = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const actionFilter = ref('')
const dateRange = ref<any>(null)

async function load() {
  const params: any = { page: page.value, pageSize: pageSize.value }
  if (actionFilter.value) params.action = actionFilter.value
  if (dateRange.value?.[0]) params.startDate = dateRange.value[0].toISOString()
  if (dateRange.value?.[1]) params.endDate = dateRange.value[1].toISOString()
  const { data } = await logApi.list(params)
  logs.value = data.data
  total.value = data.total
}

onMounted(load)
</script>
