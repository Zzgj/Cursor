import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin', 'admin'));

async function getConfig(key: string): Promise<string | null> {
  const c = await prisma.systemConfig.findUnique({ where: { configKey: key } });
  return c?.configValue ?? null;
}

async function checkOnePersonOneDevice(userName: string, excludeAssetId?: number): Promise<{ conflict: boolean; asset?: any }> {
  const enabled = await getConfig('one_person_one_device');
  if (enabled !== 'true') return { conflict: false };

  const where: any = {
    currentUserName: userName,
    status: { in: ['in_use', 'borrowed'] },
  };
  if (excludeAssetId) where.id = { not: excludeAssetId };

  const existing = await prisma.asset.findFirst({ where });
  if (existing) return { conflict: true, asset: existing };
  return { conflict: false };
}

// 出库（直接领用）
router.post('/check-out', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, userName, departmentId, remark, requestId, forceOverride } = req.body;
    if (!assetId || !userName || !departmentId) {
      res.status(400).json({ error: '资产ID、领用人、部门不能为空' });
      return;
    }

    if (requestId) {
      const existing = await prisma.assetRecord.findUnique({ where: { requestId } });
      if (existing) {
        res.json({ message: '操作已完成（重复请求）', record: existing });
        return;
      }
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'in_stock') {
      res.status(400).json({ error: `该电脑当前状态为「${statusLabel(asset.status)}」，无法出库` });
      return;
    }

    if (!forceOverride) {
      const check = await checkOnePersonOneDevice(userName);
      if (check.conflict) {
        res.status(409).json({
          error: `${userName} 已领用 ${check.asset.assetCode}，是否仍然继续？`,
          conflictType: 'one_person_one_device',
          conflictAsset: check.asset.assetCode,
        });
        return;
      }
    }

    const [updatedAsset, record] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId, status: 'in_stock' },
        data: { status: 'in_use', currentUserName: userName, departmentId, version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'check_out', userName, departmentId, operatorId: req.user!.id, remark, requestId },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '出库（领用）', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, userName, departmentId }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset, record });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(409).json({ error: '该电脑已被其他人操作，请刷新后重试' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// 分配（待领用）
router.post('/assign', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, userName, departmentId, remark, requestId } = req.body;
    if (!assetId || !userName || !departmentId) {
      res.status(400).json({ error: '资产ID、领用人、部门不能为空' });
      return;
    }

    if (requestId) {
      const existing = await prisma.assetRecord.findUnique({ where: { requestId } });
      if (existing) { res.json({ message: '操作已完成', record: existing }); return; }
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'in_stock') {
      res.status(400).json({ error: `该电脑当前状态为「${statusLabel(asset.status)}」，无法分配` });
      return;
    }

    const [updatedAsset, record] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId, status: 'in_stock' },
        data: { status: 'waiting_pickup', currentUserName: userName, departmentId, version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'assign', userName, departmentId, operatorId: req.user!.id, remark, requestId },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '分配（待领用）', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, userName, departmentId }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset, record });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(409).json({ error: '该电脑已被其他人操作，请刷新后重试' }); return; }
    res.status(500).json({ error: err.message });
  }
});

// 取消分配
router.post('/cancel-assign', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, remark } = req.body;
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'waiting_pickup') {
      res.status(400).json({ error: '该电脑当前不是待领用状态' });
      return;
    }

    const [updatedAsset] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'in_stock', currentUserName: null, departmentId: null, version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'cancel_assign', userName: asset.currentUserName, operatorId: req.user!.id, remark },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '取消分配', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 确认领用（待领用 → 使用中）
router.post('/pick-up', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, remark } = req.body;
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'waiting_pickup') {
      res.status(400).json({ error: '该电脑当前不是待领用状态' });
      return;
    }

    const [updatedAsset] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'in_use', version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'pick_up', userName: asset.currentUserName, departmentId: asset.departmentId, operatorId: req.user!.id, remark },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '确认领用', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, userName: asset.currentUserName }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 借出
router.post('/lend', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, userName, departmentId, expectedReturnDate, remark, requestId, forceOverride } = req.body;
    if (!assetId || !userName || !departmentId) {
      res.status(400).json({ error: '资产ID、借用人、部门不能为空' });
      return;
    }

    if (requestId) {
      const existing = await prisma.assetRecord.findUnique({ where: { requestId } });
      if (existing) { res.json({ message: '操作已完成', record: existing }); return; }
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'in_stock') {
      res.status(400).json({ error: `该电脑当前状态为「${statusLabel(asset.status)}」，无法借出` });
      return;
    }

    if (!forceOverride) {
      const check = await checkOnePersonOneDevice(userName);
      if (check.conflict) {
        res.status(409).json({
          error: `${userName} 已领用/借用 ${check.asset.assetCode}，是否仍然继续？`,
          conflictType: 'one_person_one_device',
          conflictAsset: check.asset.assetCode,
        });
        return;
      }
    }

    const defaultDays = parseInt((await getConfig('default_borrow_days')) || '7');
    const returnDate = expectedReturnDate ? new Date(expectedReturnDate) : new Date(Date.now() + defaultDays * 86400000);

    const [updatedAsset, record] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId, status: 'in_stock' },
        data: { status: 'borrowed', currentUserName: userName, departmentId, version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'lend', userName, departmentId, expectedReturnDate: returnDate, operatorId: req.user!.id, remark, requestId },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '借出', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, userName, departmentId, expectedReturnDate: returnDate }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset, record });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(409).json({ error: '该电脑已被其他人操作，请刷新后重试' }); return; }
    res.status(500).json({ error: err.message });
  }
});

// 归还
router.post('/return', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, remark } = req.body;
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'in_use' && asset.status !== 'borrowed') {
      res.status(400).json({ error: '该电脑当前不是使用中或借用中状态，无法归还' });
      return;
    }

    const [updatedAsset] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'in_stock', currentUserName: null, departmentId: null, version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'return', userName: asset.currentUserName, departmentId: asset.departmentId, operatorId: req.user!.id, remark },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '归还', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, userName: asset.currentUserName }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 调拨（转移）
router.post('/transfer', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, newUserName, newDepartmentId, remark } = req.body;
    if (!assetId || !newUserName || !newDepartmentId) {
      res.status(400).json({ error: '资产ID、新使用人、新部门不能为空' });
      return;
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'in_use') {
      res.status(400).json({ error: '仅使用中的电脑可以调拨' });
      return;
    }

    const oldUser = asset.currentUserName;
    const oldDept = asset.departmentId;

    const [updatedAsset] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { currentUserName: newUserName, departmentId: newDepartmentId, version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: {
          assetId, action: 'transfer', userName: newUserName, departmentId: newDepartmentId,
          operatorId: req.user!.id, remark: remark || `从 ${oldUser} 调拨至 ${newUserName}`,
        },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '调拨', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, oldUser, oldDept, newUserName, newDepartmentId }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 送修
router.post('/repair', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, faultDescription, repairVendor, remark } = req.body;
    if (!assetId || !faultDescription) {
      res.status(400).json({ error: '资产ID和故障描述不能为空' });
      return;
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status === 'in_repair' || asset.status === 'retired') {
      res.status(400).json({ error: '该电脑当前状态无法送修' });
      return;
    }

    const [updatedAsset, , repair] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'in_repair', version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'repair', userName: asset.currentUserName, operatorId: req.user!.id, remark },
      }),
      prisma.repairRecord.create({
        data: { assetId, faultDescription, repairVendor, remark },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '送修', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, faultDescription }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset, repair });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 维修完成
router.post('/repair-done', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, repairRecordId, repairCost, repairResult, remark } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status !== 'in_repair') {
      res.status(400).json({ error: '该电脑当前不是维修中状态' });
      return;
    }

    const newStatus = repairResult === 'unfixable' ? 'retired' : 'in_stock';

    const txOps: any[] = [
      prisma.asset.update({
        where: { id: assetId },
        data: {
          status: newStatus,
          ...(newStatus === 'in_stock' && { currentUserName: null, departmentId: null }),
          version: { increment: 1 },
        },
      }),
      prisma.assetRecord.create({
        data: {
          assetId, action: repairResult === 'unfixable' ? 'retire' : 'repair_done',
          operatorId: req.user!.id, remark,
        },
      }),
    ];

    if (repairRecordId) {
      txOps.push(
        prisma.repairRecord.update({
          where: { id: repairRecordId },
          data: { repairCost, repairResult: repairResult || 'fixed', endDate: new Date(), remark },
        })
      );
    }

    const results = await prisma.$transaction(txOps);

    await logOperation({
      operatorId: req.user!.id, action: repairResult === 'unfixable' ? '维修后报废' : '维修完成', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, repairCost, repairResult }, ipAddress: req.ip,
    });

    res.json({ asset: results[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 报废
router.post('/retire', async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, retireReason, remark } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
    if (asset.status === 'retired') {
      res.status(400).json({ error: '该电脑已报废' });
      return;
    }

    const [updatedAsset] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'retired', version: { increment: 1 } },
      }),
      prisma.assetRecord.create({
        data: { assetId, action: 'retire', operatorId: req.user!.id, remark: remark || retireReason },
      }),
    ]);

    await logOperation({
      operatorId: req.user!.id, action: '报废', targetType: 'Asset', targetId: assetId,
      detail: { assetCode: asset.assetCode, retireReason }, ipAddress: req.ip,
    });

    res.json({ asset: updatedAsset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    in_stock: '在库', waiting_pickup: '待领用', in_use: '使用中',
    borrowed: '借用中', in_repair: '维修中', retired: '已报废',
  };
  return map[status] || status;
}

export default router;
