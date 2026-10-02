import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

const ACTIONS = ['dismiss', 'remove', 'remove_and_suspend'] as const;
type Action = typeof ACTIONS[number];

// 신고 대상의 현재 내용과 작성자 (이미 삭제됐으면 null)
async function loadTarget(type: string, id: string) {
  if (type === 'post') {
    const p = await prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, createdAt: true, user: { select: { id: true, name: true, suspendedAt: true } } },
    });
    return p && { id: p.id, text: `${p.title}\n${p.content}`, createdAt: p.createdAt, author: p.user };
  }
  if (type === 'comment') {
    const c = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, content: true, postId: true, createdAt: true, user: { select: { id: true, name: true, suspendedAt: true } } },
    });
    return c && { id: c.id, text: c.content, postId: c.postId, createdAt: c.createdAt, author: c.user };
  }
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, suspendedAt: true } });
  return u && { id: u.id, text: null, author: u };
}

// 신고 목록: 같은 대상에 대한 신고를 묶어서, 가장 오래 기다린 것부터 (24시간 처리 기준 확인용)
router.get('/reports', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = (req.query.status as string) || 'pending';
    const reports = await prisma.report.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: { reporter: { select: { id: true, name: true } } },
      take: 500,
    });

    const groups = new Map<string, typeof reports>();
    for (const r of reports) {
      const key = `${r.targetType}:${r.targetId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    const now = Date.now();
    const items = await Promise.all([...groups.values()].map(async (rs) => {
      const first = rs[0];
      return {
        targetType: first.targetType,
        targetId: first.targetId,
        target: await loadTarget(first.targetType, first.targetId),
        reportCount: rs.length,
        oldestReportAt: first.createdAt,
        waitingHours: Math.floor((now - first.createdAt.getTime()) / 3_600_000),
        reports: rs.map((r) => ({
          id: r.id, reason: r.reason, detail: r.detail, createdAt: r.createdAt,
          reporter: r.reporter, action: r.action, note: r.note, resolvedAt: r.resolvedAt,
        })),
      };
    }));

    res.json({ items, overdue: items.filter((i) => i.waitingHours >= 24).length });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 신고 처리. 같은 대상에 대한 대기 중 신고를 모두 함께 처리한다.
// - dismiss: 문제 없음으로 기각
// - remove: 게시글/댓글 삭제 (사용자 신고는 삭제할 콘텐츠가 없으므로 remove_and_suspend 사용)
// - remove_and_suspend: 콘텐츠 삭제 + 작성자 이용 정지
router.post('/reports/resolve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, action, note } = req.body as { targetType: string; targetId: string; action: Action; note?: string };
    if (!targetType || !targetId || !ACTIONS.includes(action)) {
      res.status(400).json({ message: 'targetType, targetId, action(dismiss|remove|remove_and_suspend)을 확인해주세요.' }); return;
    }
    if (targetType === 'user' && action === 'remove') {
      res.status(400).json({ message: '사용자 신고는 dismiss 또는 remove_and_suspend로 처리해주세요.' }); return;
    }

    const pending = await prisma.report.count({ where: { targetType, targetId, status: 'pending' } });
    if (pending === 0) { res.status(404).json({ message: '처리할 대기 중 신고가 없습니다.' }); return; }

    const target = await loadTarget(targetType, targetId);
    const authorId = target?.author?.id ?? null;
    if (authorId === req.userId && action === 'remove_and_suspend') {
      res.status(400).json({ message: '자기 자신을 정지할 수 없습니다.' }); return;
    }

    await prisma.$transaction(async (tx) => {
      if (action !== 'dismiss' && target) {
        if (targetType === 'post') await tx.post.delete({ where: { id: targetId } });
        if (targetType === 'comment') await tx.comment.delete({ where: { id: targetId } });
      }
      if (action === 'remove_and_suspend' && authorId) {
        await tx.user.update({
          where: { id: authorId },
          data: { suspendedAt: new Date(), suspendReason: note?.trim() || '신고 누적에 따른 운영 정책 위반' },
        });
      }
      await tx.report.updateMany({
        where: { targetType, targetId, status: 'pending' },
        data: {
          status: action === 'dismiss' ? 'dismissed' : 'resolved',
          action, note: note?.trim() || null, resolvedAt: new Date(), resolvedById: req.userId,
        },
      });
    });

    res.json({ message: '처리되었습니다.', resolvedReports: pending, contentRemoved: action !== 'dismiss' && !!target && targetType !== 'user', suspendedUserId: action === 'remove_and_suspend' ? authorId : null });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 정지 해제 (이의 제기 처리 등)
router.post('/users/:id/unsuspend', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!user) { res.status(404).json({ message: '사용자를 찾을 수 없습니다.' }); return; }
    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: null, suspendReason: null } });
    res.json({ message: '정지가 해제되었습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
