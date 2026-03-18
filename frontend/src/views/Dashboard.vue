<template>
  <div>
    <!-- Notification alerts -->
    <el-alert v-if="notifications.overdueBorrows?.length" type="error" :closable="false" style="margin-bottom:12px">
      <template #title>
        <span>⚠️ {{ notifications.overdueBorrows.length }} 台借用电脑已超期未归还</span>
      </template>
      <div v-for="item in notifications.overdueBorrows" :key="item.assetCode" style="margin-top:4px;font-size:13px;">
        {{ item.assetCode }}　{{ item.assetName }}　借用人：{{ item.borrower }}（{{ item.department }}）　超期 {{ item.overdueDays }} 天
        <el-button link type="primary" size="small" @click="$router.push(`/assets/${item.assetId}`)">查看</el-button>
      </div>
    </el-alert>
    <el-alert v-if="notifications.expiringBorrows?.length" type="warning" :closable="false" style="margin-bottom:12px">
      <template #title>
        <span>📋 {{ notifications.expiringBorrows.length }} 台借用电脑即将到期</span>
      </template>
      <div v-for="item in notifications.expiringBorrows" :key="item.assetCode" style="margin-top:4px;font-size:13px;">
        {{ item.assetCode }}　{{ item.assetName }}　借用人：{{ item.borrower }}（{{ item.department }}）　{{ item.daysLeft <= 0 ? '今天到期' : `${item.daysLeft} 天后到期` }}
      </div>
    </el-alert>
    <el-alert v-if="notifications.overduePickups?.length" type="info" :closable="false" style="margin-bottom:12px">
      <template #title>
        <span>📋 {{ notifications.overduePickups.length }} 台电脑待领用超时</span>
      </template>
      <div v-for="item in notifications.overduePickups" :key="item.assetCode" style="margin-top:4px;font-size:13px;">
        {{ item.assetCode }}　{{ item.assetName }}　待领用人：{{ item.assignedTo }}（{{ item.department }}）　已等待 {{ item.waitingDays }} 天
        <el-button link type="primary" size="small" @click="$router.push(`/assets/${item.assetId}`)">查看</el-button>
      </div>
    </el-alert>

    <!-- Stats cards -->
    <div class="stat-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-number" style="color:#409eff">{{ stats.total }}</div>
        <div class="stat-label">资产总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-number" style="color:#67c23a">{{ stats.statusDistribution?.inStock || 0 }}</div>
        <div class="stat-label">在库</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-number" style="color:#409eff">{{ stats.statusDistribution?.inUse || 0 }}</div>
        <div class="stat-label">使用中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-number" style="color:#e6a23c">{{ stats.statusDistribution?.borrowed || 0 }}</div>
        <div class="stat-label">借用中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-number" style="color:#e6a23c">{{ stats.statusDistribution?.waitingPickup || 0 }}</div>
        <div class="stat-label">待领用</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-number" style="color:#909399">{{ stats.statusDistribution?.inRepair || 0 }}</div>
        <div class="stat-label">维修中</div>
      </el-card>
    </div>

    <!-- Charts -->
    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight:600">资产状态分布</span></template>
          <v-chart :option="statusChartOption" style="height:300px;" autoresize />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight:600">部门使用分布</span></template>
          <v-chart :option="deptChartOption" style="height:300px;" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <!-- Recent records -->
    <el-card shadow="hover">
      <template #header><span style="font-weight:600">最近操作记录</span></template>
      <el-table :data="recentRecords" stripe size="small">
        <el-table-column prop="asset.assetCode" label="电脑编号" width="160" />
        <el-table-column label="设备" width="200">
          <template #default="{ row }">{{ row.asset?.brand }} {{ row.asset?.model }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="(actionMap[row.action]?.type as any) || 'info'">{{ actionMap[row.action]?.label || row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="相关人员" width="120" />
        <el-table-column label="部门" width="140">
          <template #default="{ row }">{{ row.department?.name || '' }}</template>
        </el-table-column>
        <el-table-column prop="operator.realName" label="操作人" width="100" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.actionDate) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { dashboardApi } from '../api'
import { ACTION_MAP } from '../utils/constants'

use([PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const actionMap = ACTION_MAP
const stats = ref<any>({})
const recentRecords = ref<any[]>([])
const notifications = ref<any>({})

const statusChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: true, formatter: '{b}: {c}' },
    data: [
      { value: stats.value.statusDistribution?.inStock || 0, name: '在库', itemStyle: { color: '#67c23a' } },
      { value: stats.value.statusDistribution?.inUse || 0, name: '使用中', itemStyle: { color: '#409eff' } },
      { value: stats.value.statusDistribution?.borrowed || 0, name: '借用中', itemStyle: { color: '#e6a23c' } },
      { value: stats.value.statusDistribution?.waitingPickup || 0, name: '待领用', itemStyle: { color: '#f56c6c' } },
      { value: stats.value.statusDistribution?.inRepair || 0, name: '维修中', itemStyle: { color: '#909399' } },
      { value: stats.value.statusDistribution?.retired || 0, name: '已报废', itemStyle: { color: '#c0c4cc' } },
    ].filter(d => d.value > 0),
  }],
}))

const deptChartOption = computed(() => {
  const dist = stats.value.departmentDistribution || []
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 20, right: 20, bottom: 20, top: 20, containLabel: true },
    xAxis: { type: 'category', data: dist.map((d: any) => d.departmentName), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'bar', data: dist.map((d: any) => d.count), itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 }],
  }
})

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  const [s, r, n] = await Promise.all([dashboardApi.stats(), dashboardApi.recentRecords(), dashboardApi.notifications()])
  stats.value = s.data
  recentRecords.value = r.data
  notifications.value = n.data
})
</script>
