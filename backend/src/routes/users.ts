import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { getHiddenUserIds } from '../lib/blocks';

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

// 회원 탈퇴 (비밀번호 재확인 후 계정과 모든 데이터 영구 삭제)
router.delete('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password } = req.body ?? {};
    if (!password) { res.status(400).json({ message: '비밀번호를 입력해주세요.' }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ message: '사용자를 찾을 수 없습니다.' }); return; }
    if (!(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' }); return;
    }

    const userId = user.id;
    await prisma.$transaction(async (tx) => {
      // 내가 만든 그룹은 가장 오래된 다른 멤버에게 넘기고, 멤버가 없으면 함께 삭제
      const groups = await tx.group.findMany({ where: { createdById: userId }, select: { id: true } });
      for (const g of groups) {
        const heir = await tx.groupMember.findFirst({
          where: { groupId: g.id, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        });
        if (heir) {
          await tx.group.update({ where: { id: g.id }, data: { createdById: heir.userId } });
          await tx.groupMember.update({ where: { id: heir.id }, data: { role: 'admin' } });
        }
      }
      // 내가 만든 챌린지도 다른 참여자가 있으면 넘김
      const challenges = await tx.challenge.findMany({ where: { createdById: userId }, select: { id: true } });
      for (const c of challenges) {
        const heir = await tx.challengeParticipant.findFirst({
          where: { challengeId: c.id, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        });
        if (heir) await tx.challenge.update({ where: { id: c.id }, data: { createdById: heir.userId } });
      }
      // 나를 대상으로 한 신고 기록 정리 후 계정 삭제 (나머지는 onDelete: Cascade)
      await tx.report.deleteMany({ where: { targetType: 'user', targetId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    res.json({ message: '계정이 삭제되었습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 차단 목록
router.get('/blocks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { blocked: { select: { id: true, name: true } } },
    });
    res.json({ users: blocks.map((b) => ({ ...b.blocked, blockedAt: b.createdAt })) });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 차단 (서로의 팔로우 관계도 해제)
router.post('/:id/block', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.params.id;
    if (targetId === req.userId) { res.status(400).json({ message: '자기 자신을 차단할 수 없습니다.' }); return; }
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) { res.status(404).json({ message: '사용자를 찾을 수 없습니다.' }); return; }

    await prisma.$transaction([
      prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: targetId } },
        create: { blockerId: req.userId!, blockedId: targetId },
        update: {},
      }),
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: req.userId, followingId: targetId },
            { followerId: targetId, followingId: req.userId },
          ],
        },
      }),
    ]);
    res.json({ message: '차단했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 차단 해제
router.delete('/:id/block', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.block.deleteMany({ where: { blockerId: req.userId, blockedId: req.params.id } });
    res.json({ message: '차단을 해제했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 팔로우
router.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.userId) { res.status(400).json({ message: '자기 자신을 팔로우할 수 없습니다.' }); return; }
    const hidden = await getHiddenUserIds(prisma, req.userId!);
    if (hidden.includes(req.params.id)) { res.status(403).json({ message: '차단 관계인 사용자는 팔로우할 수 없습니다.' }); return; }
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

// 홈 피드 (팔로우한 사람들의 달리기 기록, 없으면 전체 공개 피드)
router.get('/feed', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true },
    });
    const hidden = await getHiddenUserIds(prisma, req.userId!);
    const followingIds = following.map((f) => f.followingId).filter((id) => !hidden.includes(id));

    const whereClause = followingIds.length > 0
      ? { userId: { in: followingIds } }
      : { userId: { notIn: [req.userId!, ...hidden] } };

    const runs = await prisma.run.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });
    res.json({ runs, isPublicFeed: followingIds.length === 0 });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 유저 검색
router.get('/search', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? '';
    if (!q.trim()) { res.json({ users: [] }); return; }
    const hidden = await getHiddenUserIds(prisma, req.userId!);
    const users = await prisma.user.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, id: { notIn: [req.userId!, ...hidden] } },
      select: { id: true, name: true, createdAt: true },
      take: 20,
    });
    res.json({ users });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
