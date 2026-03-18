import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '仪表盘' } },
        { path: 'assets', name: 'Assets', component: () => import('../views/AssetList.vue'), meta: { title: '资产列表' } },
        { path: 'assets/:id', name: 'AssetDetail', component: () => import('../views/AssetDetail.vue'), meta: { title: '资产详情' } },
        { path: 'stock-in', name: 'StockIn', component: () => import('../views/StockIn.vue'), meta: { title: '入库登记' } },
        { path: 'stock-out', name: 'StockOut', component: () => import('../views/StockOut.vue'), meta: { title: '出库/借用' } },
        { path: 'return', name: 'Return', component: () => import('../views/ReturnAsset.vue'), meta: { title: '归还登记' } },
        { path: 'records', name: 'Records', component: () => import('../views/Records.vue'), meta: { title: '出入库记录' } },
        { path: 'departments', name: 'Departments', component: () => import('../views/Departments.vue'), meta: { title: '部门管理' } },
        { path: 'users', name: 'Users', component: () => import('../views/Users.vue'), meta: { title: '用户管理' } },
        { path: 'config', name: 'Config', component: () => import('../views/Config.vue'), meta: { title: '系统配置' } },
        { path: 'logs', name: 'Logs', component: () => import('../views/Logs.vue'), meta: { title: '操作日志' } },
        { path: 'import', name: 'Import', component: () => import('../views/ImportExport.vue'), meta: { title: '导入导出' } },
        { path: 'backup', name: 'Backup', component: () => import('../views/Backup.vue'), meta: { title: '数据备份' } },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  if (to.meta.public) return next()
  const token = localStorage.getItem('token')
  if (!token) return next('/login')
  next()
})

export default router
