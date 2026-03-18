<template>
  <div>
    <div class="page-header">
      <h2>出库 / 借用</h2>
    </div>
    <el-card shadow="hover" style="max-width:700px;">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="操作类型" prop="actionType">
          <el-radio-group v-model="form.actionType">
            <el-radio value="check_out">领用（出库）</el-radio>
            <el-radio value="lend">借用</el-radio>
            <el-radio value="assign">分配（待领用）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="选择电脑" prop="assetId">
          <el-select v-model="form.assetId" filterable placeholder="搜索编号或型号" style="width:100%">
            <el-option v-for="a in availableAssets" :key="a.id" :label="`${a.assetCode} - ${a.brand} ${a.model}`" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="领用人/借用人" prop="userName">
          <el-input v-model="form.userName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="部门" prop="departmentId">
          <el-select v-model="form.departmentId" placeholder="选择部门" style="width:100%">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.actionType === 'lend'" label="预计归还日期">
          <el-date-picker v-model="form.expectedReturnDate" type="date" placeholder="默认7天后" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">确认{{ form.actionType === 'lend' ? '借出' : form.actionType === 'assign' ? '分配' : '出库' }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { assetApi, departmentApi, operationApi } from '../api'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const availableAssets = ref<any[]>([])
const departments = ref<any[]>([])

const form = reactive({
  actionType: 'check_out', assetId: '' as any, userName: '', departmentId: '' as any,
  expectedReturnDate: null as any, remark: '',
})

const rules = {
  assetId: [{ required: true, message: '请选择电脑', trigger: 'change' }],
  userName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }],
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const payload: any = {
      assetId: form.assetId, userName: form.userName, departmentId: form.departmentId,
      remark: form.remark, requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    if (form.actionType === 'lend' && form.expectedReturnDate) {
      payload.expectedReturnDate = form.expectedReturnDate
    }

    const apiMap: Record<string, Function> = {
      check_out: operationApi.checkOut,
      lend: operationApi.lend,
      assign: operationApi.assign,
    }

    try {
      await apiMap[form.actionType](payload)
    } catch (err: any) {
      if (err.response?.data?.conflictType === 'one_person_one_device') {
        await ElMessageBox.confirm(err.response.data.error, '冲突提醒', { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消' })
        await apiMap[form.actionType]({ ...payload, forceOverride: true })
      } else {
        throw err
      }
    }

    ElMessage.success('操作成功')
    router.push('/assets')
  } catch { /* handled */ } finally { loading.value = false }
}

onMounted(async () => {
  const [a, d] = await Promise.all([
    assetApi.list({ status: 'in_stock', pageSize: 1000 }),
    departmentApi.list(),
  ])
  availableAssets.value = a.data.data
  departments.value = d.data.filter((x: any) => x.isActive)
})
</script>
