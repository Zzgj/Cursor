import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: '没有权限执行此操作' });
      return;
    }
    next();
  };
}
