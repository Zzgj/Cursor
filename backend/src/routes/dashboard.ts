import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [total, inStock, waitingPickup, inUse, borrowed, inRepair, retired] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'in_stock' } }),
      prisma.asset.count({ where: { status: 'waiting_pickup' } }),
      prisma.asset.count({ where: { status: 'in_use' } }),
      prisma.asset.count({ where: { status: 'borrowed' } }),
      prisma.asset.count({ where: { status: 'in_repair' } }),
      prisma.asset.count({ where: { status: 'retired' } }),
    ]);

    const departmentStats = await prisma.asset.groupBy({
      by: ['departmentId'],
      where: { status: { in: ['in_use', 'borrowed'] }, departmentId: { not: null } },
      _count: { id: true },
    });

    const deptIds = departmentStats.map((d) => d.departmentId!).filter(Boolean);
    const departments = await prisma.department.findMany({ where: { id: { in: deptIds } } });
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    const departmentDistribution = departmentStats.map((d) => ({
      departmentId: d.departmentId,
      departmentName: deptMap.get(d.departmentId!) || '未知',
      count: d._count.id,
    }));

    const deviceTypeStats = await prisma.asset.groupBy({
      by: ['deviceType'],
      _count: { id: true },
    });

    res.json({
      total,
      statusDistribution: { inStock, waitingPickup, inUse, borrowed, inRepair, retired },
      departmentDistribution,
      deviceTypeDistribution: deviceTypeStats.map((d) => ({ type: d.deviceType, count: d._count.id })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent-records', async (_req: AuthRequest, res: Response) => {
  try {
    const records = await prisma.assetRecord.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { assetCode: true, brand: true, model: true } },
        operator: { select: { realName: true } },
        department: { select: { name: true } },
      },
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications', async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    const borrowAdvanceDaysConfig = await prisma.systemConfig.findUnique({ where: { configKey: 'borrow_advance_alert_days' } });
    const advanceDays = parseInt(borrowAdvanceDaysConfig?.configValue || '1');

    const pickupAlertDaysConfig = await prisma.systemConfig.findUnique({ where: { configKey: 'waiting_pickup_alert_days' } });
    const pickupAlertDays = parseInt(pickupAlertDaysConfig?.configValue || '3');

    // Overdue borrows
    const overdueBorrowRecords = await prisma.assetRecord.findMany({
      where: {
        action: 'lend',
        expectedReturnDate: { lt: now },
        asset: { status: 'borrowed' },
      },
      include: {
        asset: { select: { id: true, assetCode: true, brand: true, model: true, currentUserName: true } },
        department: { select: { name: true } },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });

    const overdueBorrows = overdueBorrowRecords.map((r) => ({
      assetId: r.asset.id,
      assetCode: r.asset.assetCode,
      assetName: `${r.asset.brand} ${r.asset.model}`,
      borrower: r.userName,
      department: r.department?.name,
      expectedReturnDate: r.expectedReturnDate,
      overdueDays: Math.floor((now.getTime() - (r.expectedReturnDate?.getTime() || 0)) / 86400000),
    }));

    // Expiring borrows (within advance days)
    const futureDate = new Date(now.getTime() + advanceDays * 86400000);
    const expiringBorrowRecords = await prisma.assetRecord.findMany({
      where: {
        action: 'lend',
        expectedReturnDate: { gte: now, lte: futureDate },
        asset: { status: 'borrowed' },
      },
      include: {
        asset: { select: { id: true, assetCode: true, brand: true, model: true } },
        department: { select: { name: true } },
      },
    });

    const expiringBorrows = expiringBorrowRecords.map((r) => ({
      assetId: r.asset.id,
      assetCode: r.asset.assetCode,
      assetName: `${r.asset.brand} ${r.asset.model}`,
      borrower: r.userName,
      department: r.department?.name,
      expectedReturnDate: r.expectedReturnDate,
      daysLeft: Math.ceil(((r.expectedReturnDate?.getTime() || 0) - now.getTime()) / 86400000),
    }));

    // Overdue pickups
    const pickupThreshold = new Date(now.getTime() - pickupAlertDays * 86400000);
    const overduePickupRecords = await prisma.assetRecord.findMany({
      where: {
        action: 'assign',
        actionDate: { lt: pickupThreshold },
        asset: { status: 'waiting_pickup' },
      },
      include: {
        asset: { select: { id: true, assetCode: true, brand: true, model: true, currentUserName: true } },
        department: { select: { name: true } },
      },
    });

    const overduePickups = overduePickupRecords.map((r) => ({
      assetId: r.asset.id,
      assetCode: r.asset.assetCode,
      assetName: `${r.asset.brand} ${r.asset.model}`,
      assignedTo: r.userName,
      department: r.department?.name,
      assignedDate: r.actionDate,
      waitingDays: Math.floor((now.getTime() - r.actionDate.getTime()) / 86400000),
    }));

    res.json({ overdueBorrows, expiringBorrows, overduePickups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
