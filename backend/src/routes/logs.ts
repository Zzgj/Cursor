import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', action, operatorId, targetType, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};
    if (action) where.action = { contains: action as string };
    if (operatorId) where.operatorId = parseInt(operatorId as string);
    if (targetType) where.targetType = targetType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [total, logs] = await Promise.all([
      prisma.operationLog.count({ where }),
      prisma.operationLog.findMany({
        where,
        include: { operator: { select: { id: true, realName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    res.json({ total, page: parseInt(page as string), pageSize: take, data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
