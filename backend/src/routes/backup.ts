import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logOperation } from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin'));

const DB_PATH = path.resolve(__dirname, '../../prisma/dev.db');
const BACKUP_DIR = path.resolve(__dirname, '../../backups');

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.db`);

    fs.copyFileSync(DB_PATH, backupPath);

    await logOperation({
      operatorId: req.user!.id,
      action: '数据备份',
      targetType: 'System',
      detail: { backupPath },
      ipAddress: req.ip,
    });

    res.json({ message: '备份成功', path: backupPath, timestamp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', async (_req: AuthRequest, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, createdAt: stat.mtime };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download/:name', async (req: AuthRequest, res: Response) => {
  try {
    const filePath = path.join(BACKUP_DIR, req.params.name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '备份文件不存在' });
      return;
    }
    res.download(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
