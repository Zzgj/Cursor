<template>
  <div>
    <div class="page-header">
      <h2>资产列表</h2>
      <el-button type="primary" @click="$router.push('/stock-in')"><el-icon><Plus /></el-icon>新增入库</el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="filters.keyword" placeholder="搜索编号/品牌/型号/序列号/使用人" prefix-icon="Search" clearable style="width:320px" @clear="loadAssets" @keyup.enter="loadAssets" />
      <el-select v-model="filters.status" placeholder="状态筛选" clearable @change="loadAssets" style="width:140px">
        <el-option label="全部" value="all" />
        <el-option v-for="(v, k) in STATUS_MAP" :key="k" :label="v.label" :value="k" />
      </el-select>
      <el-select v-model="filters.departmentId" placeholder="部门筛选" clearable @change="loadAssets" style="width:160px">
        <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-button @click="loadAssets"><el-icon><Refresh /></el-icon>刷新</el-button>
    </div>

    <el-table :data="assets" stripe border @row-click="(row: any) => $router.push(`/assets/${row.id}`)" style="cursor:pointer">
      <el-table-column prop="assetCode" label="电脑编号" width="160" fixed />
      <el-table-column label="设备类型" width="100">
        <template #default="{ row }">{{ DEVICE_TYPE_MAP[row.deviceType] || row.deviceType }}</template>
      </el-table-column>
      <el-table-column prop="brand" label="品牌" width="100" />
      <el-table-column prop="model" label="型号" width="160" show-overflow-tooltip />
      <el-table-column prop="serialNumber" label="序列号" width="150" show-overflow-tooltip />
      <el-table-column label="配置" width="240" show-overflow-tooltip>
        <template #default="{ row }">{{ [row.os, row.cpu, row.memory, row.storage].filter(Boolean).join(' / ') }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="(STATUS_MAP[row.status]?.type as any) || 'info'">{{ STATUS_MAP[row.status]?.label || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="currentUserName" label="当前使用人" width="120" />
      <el-table-column label="部门" width="140">
        <template #default="{ row }">{{ row.department?.name || '' }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
    </el-table>

    <div style="display:flex;justify-content:flex-end;margin-top:16px;">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
        :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="loadAssets" @size-change="loadAssets" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { assetApi, departmentApi } from '../api'
import { STATUS_MAP, DEVICE_TYPE_MAP } from '../utils/constants'

const assets = ref<any[]>([])
const departments = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ keyword: '', status: 'all', departmentId: '' })

async function loadAssets() {
  const { data } = await assetApi.list({ ...filters, page: page.value, pageSize: pageSize.value })
  assets.value = data.data
  total.value = data.total
}

onMounted(async () => {
  const { data } = await departmentApi.list()
  departments.value = data
  loadAssets()
})
</script>
