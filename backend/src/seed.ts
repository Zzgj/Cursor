import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { username: 'admin', password: hashed, realName: '超级管理员', role: 'super_admin', mustChangePass: false },
    });
    console.log('Created default admin user: admin / admin123');
  }

  const configs = [
    { configKey: 'one_person_one_device', configValue: 'true', description: '一人一机规则（开启后领用时检查冲突）' },
    { configKey: 'default_borrow_days', configValue: '7', description: '默认借用天数' },
    { configKey: 'waiting_pickup_alert_days', configValue: '3', description: '待领用超时提醒天数' },
    { configKey: 'borrow_advance_alert_days', configValue: '1', description: '借用到期提前提醒天数' },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { configKey: cfg.configKey },
      update: {},
      create: cfg,
    });
  }
  console.log('System configs initialized');

  const departments = ['编辑事业部', '电互联实验中心', '信息部门', '财务部门', '综合事业部', '培训教室', '领导事业部'];
  for (let i = 0; i < departments.length; i++) {
    await prisma.department.upsert({
      where: { name: departments[i] },
      update: {},
      create: { name: departments[i], sortOrder: i },
    });
  }
  console.log('Departments initialized');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
