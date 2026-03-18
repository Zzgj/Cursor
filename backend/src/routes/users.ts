import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, realName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, realName, role } = req.body;
    if (!username || !password || !realName) {
      res.status(400).json({ error: '用户名、密码、姓名不能为空' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, realName, role: role || 'admin', mustChangePass: true },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '新增用户',
      targetType: 'User',
      targetId: user.id,
      detail: { username, realName, role: role || 'admin' },
      ipAddress: req.ip,
    });

    res.json({ id: user.id, username: user.username, realName: user.realName, role: user.role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { realName, role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(realName !== undefined && { realName }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '编辑用户',
      targetType: 'User',
      targetId: id,
      detail: req.body,
      ipAddress: req.ip,
    });

    res.json({ id: user.id, username: user.username, realName: user.realName, role: user.role, isActive: user.isActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reset-password', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const newPassword = req.body.password || '123456';
    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePass: true },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '重置密码',
      targetType: 'User',
      targetId: id,
      ipAddress: req.ip,
    });

    res.json({ message: '密码已重置' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
