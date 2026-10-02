import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: '인증이 필요합니다.' });
    return;
  }
  let userId: string;
  try {
    userId = (jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }).userId;
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    return;
  }
  try {
    // 토큰이 유효해도 탈퇴했거나 이용 정지된 계정은 막는다
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, suspendedAt: true } });
    if (!user) {
      res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      return;
    }
    if (user.suspendedAt) {
      res.status(403).json({ message: '운영 정책 위반으로 이용이 정지된 계정입니다.', suspended: true });
      return;
    }
    req.userId = userId;
    req.userRole = user.role;
    next();
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// authenticate 다음에 사용
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
    return;
  }
  next();
}
