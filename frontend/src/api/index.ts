import api from './request'

export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
}

export const userApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: number, password?: string) => api.post(`/users/${id}/reset-password`, { password }),
}

export const departmentApi = {
  list: () => api.get('/departments'),
  create: (data: any) => api.post('/departments', data),
  update: (id: number, data: any) => api.put(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
}

export const assetApi = {
  list: (params: any) => api.get('/assets', { params }),
  get: (id: number) => api.get(`/assets/${id}`),
  getRecords: (id: number) => api.get(`/assets/${id}/records`),
  getRepairs: (id: number) => api.get(`/assets/${id}/repairs`),
  create: (data: any) => api.post('/assets', data),
  update: (id: number, data: any) => api.put(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
  generateCode: () => api.get('/assets/generate-code'),
}

export const operationApi = {
  checkOut: (data: any) => api.post('/operations/check-out', data),
  assign: (data: any) => api.post('/operations/assign', data),
  cancelAssign: (data: any) => api.post('/operations/cancel-assign', data),
  pickUp: (data: any) => api.post('/operations/pick-up', data),
  lend: (data: any) => api.post('/operations/lend', data),
  return: (data: any) => api.post('/operations/return', data),
  transfer: (data: any) => api.post('/operations/transfer', data),
  repair: (data: any) => api.post('/operations/repair', data),
  repairDone: (data: any) => api.post('/operations/repair-done', data),
  retire: (data: any) => api.post('/operations/retire', data),
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  recentRecords: () => api.get('/dashboard/recent-records'),
  notifications: () => api.get('/dashboard/notifications'),
}

export const configApi = {
  get: () => api.get('/config'),
  update: (data: any) => api.put('/config', data),
}

export const logApi = {
  list: (params: any) => api.get('/logs', { params }),
}

export const excelApi = {
  import: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/excel/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  exportAssets: () => api.get('/excel/export', { params: { type: 'assets' }, responseType: 'blob' }),
  exportRecords: (params?: any) => api.get('/excel/export', { params: { type: 'records', ...params }, responseType: 'blob' }),
}

export const backupApi = {
  create: () => api.post('/backup'),
  list: () => api.get('/backup/list'),
  download: (name: string) => api.get(`/backup/download/${name}`, { responseType: 'blob' }),
}
