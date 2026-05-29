import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// 내 목표 조회 + 달성률
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goal = await prisma.goal.findUnique({ where: { userId: req.userId } });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const runs = await prisma.run.findMany({ where: { userId: req.userId, createdAt: { gte: startOfMonth } } });
    const monthlyDistance = runs.reduce((s, r) => s + r.distance, 0);
    const weeklyRuns = runs.filter((r) => new Date(r.createdAt) >= startOfWeek);
    const weeklyDistance = weeklyRuns.reduce((s, r) => s + r.distance, 0);

    res.json({
      goal: goal ?? null,
      progress: {
        weeklyDistance: Math.round(weeklyDistance * 100) / 100,
        monthlyDistance: Math.round(monthlyDistance * 100) / 100,
      },
    });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 목표 설정 (upsert)
router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { weeklyDistance, monthlyDistance } = req.body;
    if (!weeklyDistance || !monthlyDistance) {
      res.status(400).json({ message: '주간/월간 목표를 모두 입력해주세요.' });
      return;
    }
    const goal = await prisma.goal.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, weeklyDistance: Number(weeklyDistance), monthlyDistance: Number(monthlyDistance) },
      update: { weeklyDistance: Number(weeklyDistance), monthlyDistance: Number(monthlyDistance) },
    });
    res.json({ goal });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
