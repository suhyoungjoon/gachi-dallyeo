import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

// 내 프로필 + 통계
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ message: '사용자를 찾을 수 없습니다.' }); return; }

    const runs = await prisma.run.findMany({ where: { userId: req.userId } });
    const totalDistance = runs.reduce((s, r) => s + r.distance, 0);
    const totalDuration = runs.reduce((s, r) => s + r.duration, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRuns = runs.filter((r) => new Date(r.createdAt) >= startOfMonth);

    const followerCount = await prisma.follow.count({ where: { followingId: req.userId } });
    const followingCount = await prisma.follow.count({ where: { followerId: req.userId } });

    res.json({
      user,
      stats: {
        totalRuns: runs.length,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDuration,
        monthlyRuns: monthlyRuns.length,
        monthlyDistance: Math.round(monthlyRuns.reduce((s, r) => s + r.distance, 0) * 100) / 100,
        followerCount,
        followingCount,
      },
    });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 프로필 수정
router.patch('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: '이름을 입력해주세요.' }); return; }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: name.trim() },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json({ user });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 팔로우
router.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.userId) { res.status(400).json({ message: '자기 자신을 팔로우할 수 없습니다.' }); return; }
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.userId!, followingId: req.params.id } },
      create: { followerId: req.userId!, followingId: req.params.id },
      update: {},
    });
    res.json({ message: '팔로우했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 언팔로우
router.delete('/:id/follow', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.follow.deleteMany({
      where: { followerId: req.userId, followingId: req.params.id },
    });
    res.json({ message: '언팔로우했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 홈 피드 (팔로우한 사람들의 달리기 기록)
router.get('/feed', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const runs = await prisma.run.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });
    res.json({ runs });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 유저 검색
router.get('/search', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? '';
    if (!q.trim()) { res.json({ users: [] }); return; }
    const users = await prisma.user.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, NOT: { id: req.userId } },
      select: { id: true, name: true, createdAt: true },
      take: 20,
    });
    res.json({ users });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
