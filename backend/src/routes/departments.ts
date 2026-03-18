import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(departments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, sortOrder } = req.body;
    if (!name) {
      res.status(400).json({ error: '部门名称不能为空' });
      return;
    }

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ error: '部门名称已存在' });
      return;
    }

    const dept = await prisma.department.create({
      data: { name, sortOrder: sortOrder ?? 0 },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '新增部门',
      targetType: 'Department',
      targetId: dept.id,
      detail: { name },
      ipAddress: req.ip,
    });

    res.json(dept);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireRole('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sortOrder, isActive } = req.body;

    const dept = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '编辑部门',
      targetType: 'Department',
      targetId: id,
      detail: req.body,
      ipAddress: req.ip,
    });

    res.json(dept);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const usageCount = await prisma.asset.count({ where: { departmentId: id } });
    if (usageCount > 0) {
      res.status(400).json({ error: '该部门下仍有资产关联，无法删除' });
      return;
    }

    await prisma.department.delete({ where: { id } });

    await logOperation({
      operatorId: req.user!.id,
      action: '删除部门',
      targetType: 'Department',
      targetId: id,
      ipAddress: req.ip,
    });

    res.json({ message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
