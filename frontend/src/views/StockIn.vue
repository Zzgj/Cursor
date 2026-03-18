<template>
  <div>
    <div class="page-header">
      <h2>入库登记</h2>
    </div>
    <el-card shadow="hover" style="max-width:800px;">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="电脑编号" prop="assetCode">
              <el-input v-model="form.assetCode" placeholder="如 NX-PC-2603-001">
                <template #append><el-button @click="autoCode" :loading="codeLoading">自动生成</el-button></template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备类型" prop="deviceType">
              <el-select v-model="form.deviceType" style="width:100%">
                <el-option v-for="(v, k) in DEVICE_TYPE_MAP" :key="k" :label="v" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌" prop="brand">
              <el-input v-model="form.brand" placeholder="如 戴尔、HP、联想" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号" prop="model">
              <el-input v-model="form.model" placeholder="如 Vostro3420" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="序列号" prop="serialNumber">
              <el-input v-model="form.serialNumber" placeholder="设备序列号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作系统">
              <el-input v-model="form.os" placeholder="如 win10专业版" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="CPU">
              <el-input v-model="form.cpu" placeholder="如 i5-1145G7" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="内存">
              <el-input v-model="form.memory" placeholder="如 16G" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="存储">
              <el-input v-model="form.storage" placeholder="如 ssd512G" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采购日期">
              <el-date-picker v-model="form.purchaseDate" type="date" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">确认入库</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { assetApi } from '../api'
import { DEVICE_TYPE_MAP } from '../utils/constants'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const codeLoading = ref(false)

const form = reactive({
  assetCode: '', deviceType: 'laptop', brand: '', model: '', serialNumber: '',
  os: '', cpu: '', memory: '', storage: '', purchaseDate: null as any, remark: '',
})

const rules = {
  assetCode: [{ required: true, message: '请输入电脑编号', trigger: 'blur' }],
  brand: [{ required: true, message: '请输入品牌', trigger: 'blur' }],
  model: [{ required: true, message: '请输入型号', trigger: 'blur' }],
  serialNumber: [{ required: true, message: '请输入序列号', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
}

async function autoCode() {
  codeLoading.value = true
  try {
    const { data } = await assetApi.generateCode()
    form.assetCode = data.code
  } catch { /* handled */ } finally { codeLoading.value = false }
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const { data } = await assetApi.create(form)
    ElMessage.success('入库成功')
    router.push(`/assets/${data.id}`)
  } catch { /* handled */ } finally { loading.value = false }
}

function resetForm() { formRef.value?.resetFields() }
</script>
