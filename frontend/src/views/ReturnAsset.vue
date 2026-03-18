<template>
  <div>
    <div class="page-header">
      <h2>归还登记</h2>
    </div>
    <el-card shadow="hover" style="max-width:700px;">
      <el-form label-width="100px">
        <el-form-item label="选择电脑">
          <el-select v-model="selectedAssetId" filterable placeholder="搜索编号、使用人" style="width:100%">
            <el-option v-for="a in outAssets" :key="a.id"
              :label="`${a.assetCode} - ${a.brand} ${a.model}（${a.currentUserName}）`" :value="a.id" />
          </el-select>
        </el-form-item>
        <div v-if="selectedAsset" style="margin-bottom:20px;">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="电脑编号">{{ selectedAsset.assetCode }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="selectedAsset.status === 'borrowed' ? 'danger' : 'primary'" size="small">
                {{ selectedAsset.status === 'borrowed' ? '借用中' : '使用中' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前使用人">{{ selectedAsset.currentUserName }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ selectedAsset.department?.name }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <el-form-item label="备注">
          <el-input v-model="remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :disabled="!selectedAssetId" :loading="loading" @click="submit">确认归还</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { assetApi, operationApi } from '../api'

const outAssets = ref<any[]>([])
const selectedAssetId = ref<number | null>(null)
const remark = ref('')
const loading = ref(false)

const selectedAsset = computed(() => outAssets.value.find(a => a.id === selectedAssetId.value))

async function submit() {
  if (!selectedAssetId.value) return
  const a = selectedAsset.value
  await ElMessageBox.confirm(`确认归还 ${a.assetCode}？使用人：${a.currentUserName}`, '归还确认')
  loading.value = true
  try {
    await operationApi.return({ assetId: selectedAssetId.value, remark: remark.value })
    ElMessage.success('归还成功')
    selectedAssetId.value = null
    remark.value = ''
    loadAssets()
  } catch { /* handled */ } finally { loading.value = false }
}

async function loadAssets() {
  const [inUse, borrowed] = await Promise.all([
    assetApi.list({ status: 'in_use', pageSize: 1000 }),
    assetApi.list({ status: 'borrowed', pageSize: 1000 }),
  ])
  outAssets.value = [...inUse.data.data, ...borrowed.data.data]
}

onMounted(loadAssets)
</script>
