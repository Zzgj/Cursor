<template>
  <div>
    <div class="page-header">
      <h2>出入库记录</h2>
    </div>
    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索电脑编号" prefix-icon="Search" clearable style="width:200px" @keyup.enter="loadRecords" />
      <el-select v-model="actionFilter" placeholder="操作类型" clearable style="width:140px" @change="loadRecords">
        <el-option v-for="(v, k) in ACTION_MAP" :key="k" :label="v.label" :value="k" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" @change="loadRecords" />
      <el-button @click="loadRecords"><el-icon><Refresh /></el-icon>刷新</el-button>
    </div>
    <el-table :data="records" stripe border>
      <el-table-column label="电脑编号" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/assets/${row.assetId}`)">{{ row.asset?.assetCode }}</el-button>
        </template>
      </el-table-column>
      <el-table-column label="设备" width="200">
        <template #default="{ row }">{{ row.asset?.brand }} {{ row.asset?.model }}</template>
      </el-table-column>
      <el-table-column label="操作类型" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="(ACTION_MAP[row.action]?.type as any) || 'info'">{{ ACTION_MAP[row.action]?.label || row.action }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="userName" label="相关人员" width="120" />
      <el-table-column label="部门" width="140">
        <template #default="{ row }">{{ row.department?.name || '' }}</template>
      </el-table-column>
      <el-table-column label="操作时间" width="170">
        <template #default="{ row }">{{ formatDate(row.actionDate) }}</template>
      </el-table-column>
      <el-table-column prop="operator.realName" label="操作人" width="100" />
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
    </el-table>
    <div style="display:flex;justify-content:flex-end;margin-top:16px;">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
        :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="loadRecords" @size-change="loadRecords" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { assetApi } from '../api'
import { ACTION_MAP } from '../utils/constants'
import api from '../api/request'

const records = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const actionFilter = ref('')
const dateRange = ref<any>(null)

async function loadRecords() {
  const params: any = { page: page.value, pageSize: pageSize.value }
  if (actionFilter.value) params.action = actionFilter.value
  if (dateRange.value?.[0]) params.startDate = dateRange.value[0].toISOString()
  if (dateRange.value?.[1]) params.endDate = dateRange.value[1].toISOString()

  let allRecords: any[] = []
  if (keyword.value) {
    const assets = await assetApi.list({ keyword: keyword.value, pageSize: 100 })
    const ids = assets.data.data.map((a: any) => a.id)
    const results = await Promise.all(ids.map((id: number) => assetApi.getRecords(id)))
    allRecords = results.flatMap(r => r.data)
    allRecords.sort((a: any, b: any) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime())
    total.value = allRecords.length
    records.value = allRecords.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  } else {
    const { data } = await api.get('/assets', { params: { pageSize: 1000 } })
    const allAssetIds = data.data.map((a: any) => a.id)
    const batchSize = 20
    for (let i = 0; i < allAssetIds.length; i += batchSize) {
      const batch = allAssetIds.slice(i, i + batchSize)
      const results = await Promise.all(batch.map((id: number) => assetApi.getRecords(id)))
      allRecords.push(...results.flatMap(r => r.data))
    }
    if (actionFilter.value) {
      allRecords = allRecords.filter((r: any) => r.action === actionFilter.value)
    }
    allRecords.sort((a: any, b: any) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime())
    total.value = allRecords.length
    records.value = allRecords.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  }
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(loadRecords)
</script>
