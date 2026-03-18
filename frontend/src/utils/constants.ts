export const STATUS_MAP: Record<string, { label: string; type: string }> = {
  in_stock: { label: '在库', type: 'success' },
  waiting_pickup: { label: '待领用', type: 'warning' },
  in_use: { label: '使用中', type: 'primary' },
  borrowed: { label: '借用中', type: 'danger' },
  in_repair: { label: '维修中', type: 'info' },
  retired: { label: '已报废', type: 'info' },
}

export const DEVICE_TYPE_MAP: Record<string, string> = {
  laptop: '笔记本',
  desktop: '台式机',
  aio: '一体机',
  server: '服务器',
}

export const ACTION_MAP: Record<string, { label: string; type: string }> = {
  stock_in: { label: '入库', type: 'success' },
  assign: { label: '分配', type: 'warning' },
  cancel_assign: { label: '取消分配', type: 'info' },
  pick_up: { label: '确认领用', type: 'primary' },
  check_out: { label: '出库(领用)', type: 'primary' },
  lend: { label: '借出', type: 'danger' },
  return: { label: '归还', type: 'success' },
  transfer: { label: '调拨', type: 'warning' },
  repair: { label: '送修', type: 'info' },
  repair_done: { label: '维修完成', type: 'success' },
  retire: { label: '报废', type: 'danger' },
}

export const ROLE_MAP: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '资产管理员',
  viewer: '只读用户',
}
