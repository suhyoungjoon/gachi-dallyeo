import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// 달리기 기록 저장
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { distance, duration, pace, calories, coordinates, courseId } = req.body;
    const run = await prisma.run.create({
      data: { userId: req.userId!, distance, duration, pace, calories, coordinates, courseId: courseId ?? null },
      include: { course: { select: { id: true, name: true } } },
    });
    res.status(201).json({ run });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 기록 목록
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const runs = await prisma.run.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, name: true } } },
    });
    res.json({ runs });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 통계
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const runs = await prisma.run.findMany({ where: { userId: req.userId } });
    const totalDistance = runs.reduce((s, r) => s + r.distance, 0);
    const totalDuration = runs.reduce((s, r) => s + r.duration, 0);
    const totalCalories = runs.reduce((s, r) => s + r.calories, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRuns = runs.filter((r) => new Date(r.createdAt) >= startOfMonth);
    const monthlyDistance = monthlyRuns.reduce((s, r) => s + r.distance, 0);

    res.json({
      totalRuns: runs.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration,
      totalCalories,
      monthlyRuns: monthlyRuns.length,
      monthlyDistance: Math.round(monthlyDistance * 100) / 100,
    });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
