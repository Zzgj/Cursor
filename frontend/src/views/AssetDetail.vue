<template>
  <div v-if="asset">
    <div class="page-header">
      <h2>
        <el-button link @click="$router.back()"><el-icon><ArrowLeft /></el-icon></el-button>
        {{ asset.assetCode }} - {{ asset.brand }} {{ asset.model }}
      </h2>
      <div style="display:flex;gap:8px;">
        <el-button v-if="asset.status === 'in_stock'" type="primary" @click="showOperationDialog('check_out')">出库(领用)</el-button>
        <el-button v-if="asset.status === 'in_stock'" type="warning" @click="showOperationDialog('lend')">借出</el-button>
        <el-button v-if="asset.status === 'in_stock'" @click="showOperationDialog('assign')">分配(待领用)</el-button>
        <el-button v-if="asset.status === 'waiting_pickup'" type="success" @click="doPickUp">确认领用</el-button>
        <el-button v-if="asset.status === 'waiting_pickup'" @click="doCancelAssign">取消分配</el-button>
        <el-button v-if="asset.status === 'in_use' || asset.status === 'borrowed'" type="success" @click="doReturn">归还</el-button>
        <el-button v-if="asset.status === 'in_use'" @click="showOperationDialog('transfer')">调拨</el-button>
        <el-button v-if="asset.status !== 'in_repair' && asset.status !== 'retired'" type="info" @click="showOperationDialog('repair')">送修</el-button>
        <el-button type="info" @click="editMode = true"><el-icon><Edit /></el-icon>编辑</el-button>
      </div>
    </div>

    <!-- Info cards -->
    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header><span style="font-weight:600">基本信息</span></template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="电脑编号">{{ asset.assetCode }}</el-descriptions-item>
            <el-descriptions-item label="设备类型">{{ DEVICE_TYPE_MAP[asset.deviceType] }}</el-descriptions-item>
            <el-descriptions-item label="品牌">{{ asset.brand }}</el-descriptions-item>
            <el-descriptions-item label="型号">{{ asset.model }}</el-descriptions-item>
            <el-descriptions-item label="序列号">{{ asset.serialNumber }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="(STATUS_MAP[asset.status]?.type as any)">{{ STATUS_MAP[asset.status]?.label }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="操作系统">{{ asset.os || '-' }}</el-descriptions-item>
            <el-descriptions-item label="CPU">{{ asset.cpu || '-' }}</el-descriptions-item>
            <el-descriptions-item label="内存">{{ asset.memory || '-' }}</el-descriptions-item>
            <el-descriptions-item label="存储">{{ asset.storage || '-' }}</el-descriptions-item>
            <el-descriptions-item label="当前使用人">{{ asset.currentUserName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ asset.department?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="3">{{ asset.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" style="height:100%">
          <template #header><span style="font-weight:600">曾用人</span></template>
          <div v-if="previousUsers.length">
            <div v-for="pu in previousUsers" :key="pu.name + pu.dept" style="margin-bottom:8px;font-size:14px;">
              <el-icon><User /></el-icon> {{ pu.name }}<span style="color:#909399;margin-left:6px;">（{{ pu.dept }}）</span>
            </div>
          </div>
          <el-empty v-else description="暂无曾用人记录" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- Timeline -->
    <el-card shadow="hover">
      <template #header><span style="font-weight:600">流转历史</span></template>
      <el-timeline>
        <el-timeline-item v-for="r in records" :key="r.id" :timestamp="formatDate(r.actionDate)" placement="top"
          :type="(ACTION_MAP[r.action]?.type as any) || 'info'">
          <el-card shadow="never" style="padding:8px 12px;">
            <el-tag size="small" :type="(ACTION_MAP[r.action]?.type as any) || 'info'" style="margin-right:8px;">{{ ACTION_MAP[r.action]?.label || r.action }}</el-tag>
            <span v-if="r.userName">{{ r.userName }}</span>
            <span v-if="r.department" style="color:#909399;margin-left:4px;">（{{ r.department.name }}）</span>
            <span v-if="r.expectedReturnDate" style="color:#e6a23c;margin-left:8px;font-size:12px;">预计归还：{{ formatDate(r.expectedReturnDate) }}</span>
            <span style="color:#909399;margin-left:12px;font-size:12px;">操作人：{{ r.operator?.realName }}</span>
            <div v-if="r.remark" style="color:#909399;font-size:12px;margin-top:4px;">备注：{{ r.remark }}</div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="!records.length" description="暂无记录" />
    </el-card>

    <!-- Edit dialog -->
    <el-dialog v-model="editMode" title="编辑资产信息" width="600px">
      <el-form :model="editForm" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="品牌"><el-input v-model="editForm.brand" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="型号"><el-input v-model="editForm.model" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="设备类型">
            <el-select v-model="editForm.deviceType" style="width:100%">
              <el-option v-for="(v, k) in DEVICE_TYPE_MAP" :key="k" :label="v" :value="k" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="序列号"><el-input v-model="editForm.serialNumber" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="操作系统"><el-input v-model="editForm.os" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="CPU"><el-input v-model="editForm.cpu" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="内存"><el-input v-model="editForm.memory" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="存储"><el-input v-model="editForm.storage" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="editForm.remark" type="textarea" :rows="3" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editMode = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- Operation dialog -->
    <el-dialog v-model="opDialogVisible" :title="opDialogTitle" width="500px">
      <el-form :model="opForm" label-width="100px">
        <el-form-item v-if="opType !== 'repair'" label="人员姓名" required>
          <el-input v-model="opForm.userName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item v-if="opType !== 'repair'" label="部门" required>
          <el-select v-model="opForm.departmentId" placeholder="选择部门" style="width:100%">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="opType === 'lend'" label="预计归还日期">
          <el-date-picker v-model="opForm.expectedReturnDate" type="date" style="width:100%" />
        </el-form-item>
        <el-form-item v-if="opType === 'repair'" label="故障描述" required>
          <el-input v-model="opForm.faultDescription" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item v-if="opType === 'repair'" label="维修商">
          <el-input v-model="opForm.repairVendor" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="opForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="opDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="opLoading" @click="submitOperation">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { assetApi, operationApi, departmentApi } from '../api'
import { STATUS_MAP, DEVICE_TYPE_MAP, ACTION_MAP } from '../utils/constants'

const route = useRoute()
const asset = ref<any>(null)
const records = ref<any[]>([])
const departments = ref<any[]>([])
const editMode = ref(false)
const editForm = reactive<any>({})

const previousUsers = computed(() => {
  const seen = new Set<string>()
  const result: { name: string; dept: string }[] = []
  for (const r of records.value) {
    if (['check_out', 'lend', 'assign', 'pick_up', 'transfer'].includes(r.action) && r.userName) {
      const key = `${r.userName}-${r.department?.name || ''}`
      if (!seen.has(key) && r.userName !== asset.value?.currentUserName) {
        seen.add(key)
        result.push({ name: r.userName, dept: r.department?.name || '未知' })
      }
    }
  }
  return result
})

const opDialogVisible = ref(false)
const opType = ref('')
const opLoading = ref(false)
const opForm = reactive<any>({})

const opDialogTitle = computed(() => {
  const map: Record<string, string> = { check_out: '出库（领用）', lend: '借出', assign: '分配（待领用）', transfer: '调拨', repair: '送修' }
  return map[opType.value] || '操作'
})

function showOperationDialog(type: string) {
  opType.value = type
  opForm.userName = type === 'transfer' ? '' : ''
  opForm.departmentId = ''
  opForm.expectedReturnDate = null
  opForm.faultDescription = ''
  opForm.repairVendor = ''
  opForm.remark = ''
  opDialogVisible.value = true
}

async function submitOperation() {
  opLoading.value = true
  try {
    const payload: any = { assetId: asset.value.id, ...opForm }
    if (opType.value === 'transfer') {
      payload.newUserName = opForm.userName
      payload.newDepartmentId = opForm.departmentId
    }

    const apiMap: Record<string, Function> = {
      check_out: operationApi.checkOut,
      lend: operationApi.lend,
      assign: operationApi.assign,
      transfer: operationApi.transfer,
      repair: operationApi.repair,
    }

    try {
      await apiMap[opType.value](payload)
    } catch (err: any) {
      if (err.response?.data?.conflictType === 'one_person_one_device') {
        await ElMessageBox.confirm(err.response.data.error, '冲突提醒', { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消' })
        await apiMap[opType.value]({ ...payload, forceOverride: true })
      } else {
        throw err
      }
    }

    ElMessage.success('操作成功')
    opDialogVisible.value = false
    await loadData()
  } catch { /* handled */ } finally { opLoading.value = false }
}

async function doReturn() {
  await ElMessageBox.confirm(`确认归还 ${asset.value.assetCode}？当前使用人：${asset.value.currentUserName}`, '归还确认', { type: 'info' })
  await operationApi.return({ assetId: asset.value.id })
  ElMessage.success('归还成功')
  loadData()
}

async function doPickUp() {
  await ElMessageBox.confirm(`确认 ${asset.value.currentUserName} 已领取 ${asset.value.assetCode}？`, '领用确认', { type: 'info' })
  await operationApi.pickUp({ assetId: asset.value.id })
  ElMessage.success('确认领用成功')
  loadData()
}

async function doCancelAssign() {
  await ElMessageBox.confirm(`取消分配 ${asset.value.assetCode}，将回到在库状态`, '确认取消分配', { type: 'warning' })
  await operationApi.cancelAssign({ assetId: asset.value.id })
  ElMessage.success('已取消分配')
  loadData()
}

async function loadData() {
  const id = parseInt(route.params.id as string)
  const [a, r] = await Promise.all([assetApi.get(id), assetApi.getRecords(id)])
  asset.value = a.data
  records.value = r.data
  Object.assign(editForm, { ...a.data })
}

async function saveEdit() {
  try {
    await assetApi.update(asset.value.id, editForm)
    ElMessage.success('保存成功')
    editMode.value = false
    loadData()
  } catch { /* handled */ }
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  const { data } = await departmentApi.list()
  departments.value = data.filter((d: any) => d.isActive)
  loadData()
})

watch(() => route.params.id, () => { if (route.params.id) loadData() })
</script>
