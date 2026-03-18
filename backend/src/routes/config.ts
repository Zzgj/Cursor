import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const map: Record<string, string> = {};
    configs.forEach((c) => { map[c.configKey] = c.configValue; });
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const updates: Record<string, string> = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemConfig.upsert({
        where: { configKey: key },
        update: { configValue: String(value) },
        create: { configKey: key, configValue: String(value), description: '' },
      });
    }

    await logOperation({
      operatorId: req.user!.id,
      action: '修改系统配置',
      targetType: 'SystemConfig',
      detail: updates,
      ipAddress: req.ip,
    });

    res.json({ message: '配置已更新' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
