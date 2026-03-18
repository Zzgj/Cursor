<template>
  <div>
    <div class="page-header">
      <h2>导入导出</h2>
    </div>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight:600">Excel 导入</span></template>
          <p style="color:#909399;margin-bottom:16px;font-size:14px;">
            支持的列名：电脑编号、设备类型、型号、序列号(EX)、配置、现定人、部门、设备状态、备注
          </p>
          <el-upload ref="uploadRef" :auto-upload="false" accept=".xlsx,.xls,.csv" :limit="1" :on-change="handleFileChange" drag>
            <el-icon :size="40" style="color:#909399"><UploadFilled /></el-icon>
            <div>将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div style="color:#909399;font-size:12px;">支持 .xlsx / .xls / .csv 格式，文件大小不超过 10MB</div>
            </template>
          </el-upload>
          <el-button type="primary" :loading="importing" :disabled="!selectedFile" @click="doImport" style="margin-top:16px;">
            开始导入
          </el-button>

          <div v-if="importResult" style="margin-top:16px;">
            <el-alert :type="importResult.failed > 0 ? 'warning' : 'success'" :closable="false">
              <template #title>导入完成：成功 {{ importResult.success }} 条，失败 {{ importResult.failed }} 条</template>
              <div v-if="importResult.errors?.length" style="max-height:200px;overflow-y:auto;margin-top:8px;">
                <div v-for="(e, i) in importResult.errors" :key="i" style="font-size:12px;color:#f56c6c;">{{ e }}</div>
              </div>
            </el-alert>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight:600">Excel 导出</span></template>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <el-button type="primary" @click="exportAssets" :loading="exporting === 'assets'">
              <el-icon><Download /></el-icon>导出资产清单
            </el-button>
            <el-button type="success" @click="exportRecords" :loading="exporting === 'records'">
              <el-icon><Download /></el-icon>导出出入库记录
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { excelApi } from '../api'

const uploadRef = ref()
const selectedFile = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<any>(null)
const exporting = ref('')

function handleFileChange(file: any) {
  selectedFile.value = file.raw
}

async function doImport() {
  if (!selectedFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const { data } = await excelApi.import(selectedFile.value)
    importResult.value = data
    ElMessage.success(`导入完成：成功 ${data.success} 条`)
  } catch { /* handled */ } finally {
    importing.value = false
    uploadRef.value?.clearFiles()
    selectedFile.value = null
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function exportAssets() {
  exporting.value = 'assets'
  try {
    const { data } = await excelApi.exportAssets()
    downloadBlob(data, `资产清单_${new Date().toISOString().split('T')[0]}.xlsx`)
    ElMessage.success('导出成功')
  } catch { /* handled */ } finally { exporting.value = '' }
}

async function exportRecords() {
  exporting.value = 'records'
  try {
    const { data } = await excelApi.exportRecords()
    downloadBlob(data, `出入库记录_${new Date().toISOString().split('T')[0]}.xlsx`)
    ElMessage.success('导出成功')
  } catch { /* handled */ } finally { exporting.value = '' }
}
</script>
