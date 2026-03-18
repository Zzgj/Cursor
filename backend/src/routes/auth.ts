import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: '请输入用户名和密码' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logOperation({
      operatorId: user.id,
      action: '用户登录',
      targetType: 'User',
      targetId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        mustChangePass: user.mustChangePass,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: '请输入旧密码和新密码' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: '新密码长度至少6位' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: '旧密码错误' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePass: false },
    });

    await logOperation({
      operatorId: req.user!.id,
      action: '修改密码',
      targetType: 'User',
      targetId: user.id,
      ipAddress: req.ip,
    });

    res.json({ message: '密码修改成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, realName: true, role: true, mustChangePass: true },
    });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
