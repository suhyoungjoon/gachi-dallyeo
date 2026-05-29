import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// 챌린지 목록 (참여 중 + 참여 가능)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const myParticipations = await prisma.challengeParticipant.findMany({
      where: { userId: req.userId },
      select: { challengeId: true },
    });
    const myIds = myParticipations.map((p) => p.challengeId);

    const [myChallenges, openChallenges] = await Promise.all([
      prisma.challenge.findMany({
        where: { id: { in: myIds } },
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { participants: true } },
        },
        orderBy: { endDate: 'asc' },
      }),
      prisma.challenge.findMany({
        where: { id: { notIn: myIds }, endDate: { gte: now } },
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // 내 챌린지별 진행 거리 계산
    const myProgress: Record<string, number> = {};
    for (const c of myChallenges) {
      const runs = await prisma.run.findMany({
        where: { userId: req.userId, createdAt: { gte: c.startDate, lte: c.endDate } },
      });
      myProgress[c.id] = Math.round(runs.reduce((s, r) => s + r.distance, 0) * 100) / 100;
    }

    res.json({ myChallenges, openChallenges, myProgress });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 챌린지 생성 (생성자 자동 참여)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, targetDistance, startDate, endDate } = req.body;
    if (!title?.trim() || !targetDistance || !startDate || !endDate) {
      res.status(400).json({ message: '모든 항목을 입력해주세요.' });
      return;
    }
    const challenge = await prisma.challenge.create({
      data: {
        title: title.trim(),
        targetDistance: Number(targetDistance),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById: req.userId!,
        participants: { create: { userId: req.userId! } },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });
    res.status(201).json({ challenge });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 챌린지 상세 + 리더보드
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!challenge) { res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' }); return; }

    const isParticipating = challenge.participants.some((p) => p.userId === req.userId);

    // 참여자별 달린 거리
    const leaderboard = await Promise.all(
      challenge.participants.map(async (p) => {
        const runs = await prisma.run.findMany({
          where: { userId: p.userId, createdAt: { gte: challenge.startDate, lte: challenge.endDate } },
        });
        const distance = Math.round(runs.reduce((s, r) => s + r.distance, 0) * 100) / 100;
        return { user: p.user, distance };
      })
    );
    leaderboard.sort((a, b) => b.distance - a.distance);

    res.json({ challenge, leaderboard, isParticipating });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 챌린지 참여
router.post('/:id/join', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
    if (!challenge) { res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' }); return; }
    if (new Date() > challenge.endDate) { res.status(400).json({ message: '종료된 챌린지입니다.' }); return; }

    await prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId: req.params.id, userId: req.userId! } },
      create: { challengeId: req.params.id, userId: req.userId! },
      update: {},
    });
    res.json({ message: '챌린지에 참여했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 챌린지 나가기
router.delete('/:id/join', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.challengeParticipant.deleteMany({
      where: { challengeId: req.params.id, userId: req.userId },
    });
    res.json({ message: '챌린지에서 나갔습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
