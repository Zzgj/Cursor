import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin', 'admin'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const STATUS_MAP: Record<string, string> = {
  '在库': 'in_stock', '使用中': 'in_use', '借用中': 'borrowed',
  '待领用': 'waiting_pickup', '维修中': 'in_repair', '已报废': 'retired',
};

const DEVICE_TYPE_MAP: Record<string, string> = {
  '笔记本': 'laptop', '笔本': 'laptop', '台式机': 'desktop',
  '一体机': 'aio', '服务器': 'server',
};

router.post('/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传文件' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const assetCode = row['电脑编号'] || row['assetCode'];
        const brand = row['型号']?.split(/(?<=[\u4e00-\u9fa5])(?=[A-Z])/)?.[0] || row['brand'] || '';
        const model = row['型号']?.split(/(?<=[\u4e00-\u9fa5])(?=[A-Z])/)?.[1] || row['model'] || row['型号'] || '';
        const serialNumber = String(row['序列号(EX)'] || row['序列号'] || row['serialNumber'] || `IMPORT-${Date.now()}-${i}`);
        const deviceType = DEVICE_TYPE_MAP[row['设备类型']] || row['deviceType'] || 'laptop';

        if (!assetCode) {
          results.errors.push(`第${i + 2}行：电脑编号为空，已跳过`);
          results.failed++;
          continue;
        }

        const existing = await prisma.asset.findUnique({ where: { assetCode } });
        if (existing) {
          results.errors.push(`第${i + 2}行：编号 ${assetCode} 已存在，已跳过`);
          results.failed++;
          continue;
        }

        let config = row['配置'] || '';
        let os = row['os'] || '', cpu = row['cpu'] || '', memory = row['memory'] || '', storage = row['storage'] || '';
        if (config && !os) {
          const parts = config.split(/[\s/]+/);
          os = parts.find((p: string) => /win/i.test(p)) ? parts.slice(0, parts.findIndex((p: string) => /i[357]-/i.test(p) || /AMD/i.test(p))).join(' ') : '';
          cpu = parts.find((p: string) => /i[357]-|AMD|Ryzen/i.test(p)) || '';
          memory = parts.find((p: string) => /\d+G$/i.test(p)) || '';
          storage = parts.find((p: string) => /ssd|hdd|nvme/i.test(p)) || '';
        }

        const statusText = row['设备状态'] || row['status'] || '在库';
        const status = STATUS_MAP[statusText] || 'in_stock';
        const currentUserName = row['现定人'] || row['currentUserName'] || null;
        const deptName = row['部门'] || row['department'] || null;

        let departmentId: number | null = null;
        if (deptName) {
          const dept = await prisma.department.upsert({
            where: { name: deptName },
            update: {},
            create: { name: deptName, sortOrder: 0 },
          });
          departmentId = dept.id;
        }

        await prisma.asset.create({
          data: {
            assetCode, deviceType, brand, model, serialNumber,
            os: os || null, cpu: cpu || null, memory: memory || null, storage: storage || null,
            status, currentUserName, departmentId,
            remark: row['备注'] || row['remark'] || null,
          },
        });

        await prisma.assetRecord.create({
          data: {
            assetId: (await prisma.asset.findUnique({ where: { assetCode } }))!.id,
            action: 'stock_in',
            userName: currentUserName,
            departmentId,
            operatorId: req.user!.id,
            remark: 'Excel导入',
          },
        });

        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i + 2}行：${err.message}`);
        results.failed++;
      }
    }

    await logOperation({
      operatorId: req.user!.id,
      action: 'Excel导入资产',
      targetType: 'Asset',
      detail: { total: rows.length, success: results.success, failed: results.failed },
      ipAddress: req.ip,
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'assets' } = req.query;

    if (type === 'assets') {
      const assets = await prisma.asset.findMany({
        include: { department: { select: { name: true } } },
        orderBy: { assetCode: 'asc' },
      });

      const data = assets.map((a) => ({
        '电脑编号': a.assetCode,
        '设备类型': deviceTypeLabel(a.deviceType),
        '品牌': a.brand,
        '型号': a.model,
        '序列号': a.serialNumber,
        '操作系统': a.os || '',
        'CPU': a.cpu || '',
        '内存': a.memory || '',
        '存储': a.storage || '',
        '状态': statusLabel(a.status),
        '当前使用人': a.currentUserName || '',
        '部门': a.department?.name || '',
        '备注': a.remark || '',
        '入库时间': a.createdAt.toISOString().split('T')[0],
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '资产列表');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=assets_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buf);
    } else if (type === 'records') {
      const { startDate, endDate } = req.query;
      const where: any = {};
      if (startDate || endDate) {
        where.actionDate = {};
        if (startDate) where.actionDate.gte = new Date(startDate as string);
        if (endDate) where.actionDate.lte = new Date(endDate as string);
      }

      const records = await prisma.assetRecord.findMany({
        where,
        include: {
          asset: { select: { assetCode: true, brand: true, model: true } },
          operator: { select: { realName: true } },
          department: { select: { name: true } },
        },
        orderBy: { actionDate: 'desc' },
      });

      const data = records.map((r) => ({
        '电脑编号': r.asset.assetCode,
        '设备': `${r.asset.brand} ${r.asset.model}`,
        '操作类型': actionLabel(r.action),
        '领用人/归还人': r.userName || '',
        '部门': r.department?.name || '',
        '操作时间': r.actionDate.toISOString().replace('T', ' ').substring(0, 19),
        '操作人': r.operator.realName,
        '备注': r.remark || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '出入库记录');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=records_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buf);
    } else {
      res.status(400).json({ error: '不支持的导出类型' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function statusLabel(s: string) {
  const m: Record<string, string> = { in_stock: '在库', waiting_pickup: '待领用', in_use: '使用中', borrowed: '借用中', in_repair: '维修中', retired: '已报废' };
  return m[s] || s;
}
function deviceTypeLabel(t: string) {
  const m: Record<string, string> = { laptop: '笔记本', desktop: '台式机', aio: '一体机', server: '服务器' };
  return m[t] || t;
}
function actionLabel(a: string) {
  const m: Record<string, string> = { stock_in: '入库', assign: '分配', cancel_assign: '取消分配', pick_up: '确认领用', check_out: '出库(领用)', lend: '借出', return: '归还', transfer: '调拨', repair: '送修', repair_done: '维修完成', retire: '报废' };
  return m[a] || a;
}

export default router;
