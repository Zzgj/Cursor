import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';
import { generateAssetCode } from '../utils/assetCode';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, keyword, departmentId, page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (departmentId) where.departmentId = parseInt(departmentId as string);
    if (keyword) {
      where.OR = [
        { assetCode: { contains: keyword as string } },
        { brand: { contains: keyword as string } },
        { model: { contains: keyword as string } },
        { serialNumber: { contains: keyword as string } },
        { currentUserName: { contains: keyword as string } },
        { remark: { contains: keyword as string } },
      ];
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        include: { department: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    ]);

    res.json({ total, page: parseInt(page as string), pageSize: take, data: assets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/generate-code', async (_req: AuthRequest, res: Response) => {
  try {
    const code = await generateAssetCode();
    res.json({ code });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!asset) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }
    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/records', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const records = await prisma.assetRecord.findMany({
      where: { assetId: id },
      include: {
        operator: { select: { id: true, realName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { actionDate: 'desc' },
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/repairs', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repairs = await prisma.repairRecord.findMany({
      where: { assetId: id },
      orderBy: { startDate: 'desc' },
    });
    res.json(repairs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    if (!data.assetCode || !data.brand || !data.model || !data.serialNumber) {
      res.status(400).json({ error: '电脑编号、品牌、型号、序列号不能为空' });
      return;
    }

    const existCode = await prisma.asset.findUnique({ where: { assetCode: data.assetCode } });
    if (existCode) {
      res.status(400).json({ error: `电脑编号 ${data.assetCode} 已存在` });
      return;
    }
    const existSN = await prisma.asset.findUnique({ where: { serialNumber: data.serialNumber } });
    if (existSN) {
      res.status(400).json({ error: `序列号 ${data.serialNumber} 已存在` });
      return;
    }

    const asset = await prisma.asset.create({
      data: {
        assetCode: data.assetCode,
        deviceType: data.deviceType || 'laptop',
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        os: data.os,
        cpu: data.cpu,
        memory: data.memory,
        storage: data.storage,
        status: 'in_stock',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        remark: data.remark,
      },
    });

    await prisma.assetRecord.create({
      data: {
        assetId: asset.id,
        action: 'stock_in',
        actionDate: new Date(),
        operatorId: req.user!.id,
        remark: data.recordRemark || '新设备入库',
      },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '新增资产并入库',
      targetType: 'Asset',
      targetId: asset.id,
      detail: { assetCode: asset.assetCode, brand: asset.brand, model: asset.model },
      ipAddress: req.ip,
    });

    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireRole('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    const current = await prisma.asset.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }

    if (data.version !== undefined && data.version !== current.version) {
      res.status(409).json({ error: '该资产信息已被其他人修改，请刷新后重试' });
      return;
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.deviceType !== undefined && { deviceType: data.deviceType }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.os !== undefined && { os: data.os }),
        ...(data.cpu !== undefined && { cpu: data.cpu }),
        ...(data.memory !== undefined && { memory: data.memory }),
        ...(data.storage !== undefined && { storage: data.storage }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
        ...(data.warrantyExpiry !== undefined && { warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null }),
        ...(data.remark !== undefined && { remark: data.remark }),
        version: { increment: 1 },
      },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '编辑资产信息',
      targetType: 'Asset',
      targetId: id,
      detail: data,
      ipAddress: req.ip,
    });

    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }
    if (asset.status !== 'in_stock' && asset.status !== 'retired') {
      res.status(400).json({ error: '仅在库或已报废的资产可以删除' });
      return;
    }

    await prisma.repairRecord.deleteMany({ where: { assetId: id } });
    await prisma.assetRecord.deleteMany({ where: { assetId: id } });
    await prisma.asset.delete({ where: { id } });

    await logOperation({
      operatorId: req.user!.id,
      action: '删除资产',
      targetType: 'Asset',
      targetId: id,
      detail: { assetCode: asset.assetCode },
      ipAddress: req.ip,
    });

    res.json({ message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
