import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// 내 그룹 + 공개 그룹 목록
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const myGroups = await prisma.group.findMany({
      where: { members: { some: { userId: req.userId } } },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId: req.userId }, select: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myGroupIds = myGroups.map((g) => g.id);
    const publicGroups = await prisma.group.findMany({
      where: { isPublic: true, id: { notIn: myGroupIds } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ myGroups, publicGroups });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 그룹 생성
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: '그룹 이름을 입력해주세요.' }); return; }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic !== false,
        createdById: req.userId!,
        members: { create: { userId: req.userId!, role: 'admin' } },
      },
      include: { _count: { select: { members: true } } },
    });

    res.status(201).json({ group });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 그룹 상세 (홈: 통계 + 멤버 랭킹 + 최근 런)
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });
    if (!group) { res.status(404).json({ message: '그룹을 찾을 수 없습니다.' }); return; }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId! } },
    });

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    const memberIds = members.map((m) => m.userId);

    // 이번 달 멤버별 달리기 통계
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRuns = await prisma.run.findMany({
      where: { userId: { in: memberIds }, createdAt: { gte: startOfMonth } },
      select: { userId: true, distance: true, duration: true },
    });

    const rankMap: Record<string, { distance: number; runs: number }> = {};
    for (const run of monthlyRuns) {
      if (!rankMap[run.userId]) rankMap[run.userId] = { distance: 0, runs: 0 };
      rankMap[run.userId].distance += run.distance;
      rankMap[run.userId].runs += 1;
    }

    const memberRankings = members
      .map((m) => ({
        userId: m.userId,
        name: m.user.name,
        role: m.role,
        distance: Math.round((rankMap[m.userId]?.distance ?? 0) * 100) / 100,
        runs: rankMap[m.userId]?.runs ?? 0,
      }))
      .sort((a, b) => b.distance - a.distance);

    const weeklyStats = {
      totalDistance: Math.round(monthlyRuns.reduce((s, r) => s + r.distance, 0) * 100) / 100,
      totalRuns: monthlyRuns.length,
      activeMembers: Object.keys(rankMap).length,
    };

    // 최근 달리기 기록
    const recentRuns = await prisma.run.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { id: true, name: true } }, course: { select: { id: true, name: true } } },
    });

    res.json({
      group,
      isMember: !!membership,
      myRole: membership?.role ?? null,
      members: memberRankings,
      weeklyStats,
      recentRuns,
    });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 그룹 참여 (공개: 바로 / 비공개: 초대코드 필요)
router.post('/:id/join', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) { res.status(404).json({ message: '그룹을 찾을 수 없습니다.' }); return; }

    if (!group.isPublic) {
      const { inviteCode } = req.body;
      if (inviteCode !== group.inviteCode) {
        res.status(403).json({ message: '초대코드가 올바르지 않습니다.' }); return;
      }
    }

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId! } },
      create: { groupId: req.params.id, userId: req.userId!, role: 'member' },
      update: {},
    });

    res.json({ message: '참여했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 초대코드로 참여
router.post('/join-by-code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const group = await prisma.group.findUnique({ where: { inviteCode } });
    if (!group) { res.status(404).json({ message: '유효하지 않은 초대코드입니다.' }); return; }

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
      create: { groupId: group.id, userId: req.userId!, role: 'member' },
      update: {},
    });

    res.json({ group: { id: group.id, name: group.name } });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 그룹 탈퇴
router.delete('/:id/leave', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId! } },
    });
    res.json({ message: '탈퇴했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 그룹 게시판
router.get('/:id/posts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.userId! } },
    });
    if (!membership) { res.status(403).json({ message: '그룹 멤버만 볼 수 있습니다.' }); return; }

    const posts = await prisma.post.findMany({
      where: { groupId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    res.json({ posts });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
