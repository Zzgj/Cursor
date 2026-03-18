<template>
  <div>
    <div class="page-header">
      <h2>系统配置</h2>
    </div>
    <el-card shadow="hover" style="max-width:600px;">
      <el-form label-width="180px" v-if="loaded">
        <el-form-item label="一人一机规则">
          <el-switch v-model="configs.one_person_one_device" active-text="开启" inactive-text="关闭" />
          <div style="color:#909399;font-size:12px;margin-top:4px;">开启后，出库时会检查领用人是否已领用其他电脑</div>
        </el-form-item>
        <el-form-item label="默认借用天数">
          <el-input-number v-model="configs.default_borrow_days" :min="1" :max="365" />
          <span style="margin-left:8px;color:#909399;font-size:12px;">天</span>
        </el-form-item>
        <el-form-item label="待领用超时提醒天数">
          <el-input-number v-model="configs.waiting_pickup_alert_days" :min="1" :max="30" />
          <span style="margin-left:8px;color:#909399;font-size:12px;">天未领取则提醒</span>
        </el-form-item>
        <el-form-item label="借用到期提前提醒天数">
          <el-input-number v-model="configs.borrow_advance_alert_days" :min="0" :max="7" />
          <span style="margin-left:8px;color:#909399;font-size:12px;">天（0=仅到期当天提醒）</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { configApi } from '../api'

const loaded = ref(false)
const saving = ref(false)
const configs = reactive({
  one_person_one_device: true,
  default_borrow_days: 7,
  waiting_pickup_alert_days: 3,
  borrow_advance_alert_days: 1,
})

onMounted(async () => {
  const { data } = await configApi.get()
  configs.one_person_one_device = data.one_person_one_device === 'true'
  configs.default_borrow_days = parseInt(data.default_borrow_days) || 7
  configs.waiting_pickup_alert_days = parseInt(data.waiting_pickup_alert_days) || 3
  configs.borrow_advance_alert_days = parseInt(data.borrow_advance_alert_days) || 1
  loaded.value = true
})

async function save() {
  saving.value = true
  try {
    await configApi.update({
      one_person_one_device: String(configs.one_person_one_device),
      default_borrow_days: String(configs.default_borrow_days),
      waiting_pickup_alert_days: String(configs.waiting_pickup_alert_days),
      borrow_advance_alert_days: String(configs.borrow_advance_alert_days),
    })
    ElMessage.success('配置已保存')
  } catch { /* handled */ } finally { saving.value = false }
}
</script>
