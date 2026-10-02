import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

const TARGET_TYPES = ['post', 'comment', 'user'] as const;
type TargetType = typeof TARGET_TYPES[number];

async function targetOwnerId(type: TargetType, id: string): Promise<string | null> {
  if (type === 'post') return (await prisma.post.findUnique({ where: { id }, select: { userId: true } }))?.userId ?? null;
  if (type === 'comment') return (await prisma.comment.findUnique({ where: { id }, select: { userId: true } }))?.userId ?? null;
  return (await prisma.user.findUnique({ where: { id }, select: { id: true } }))?.id ?? null;
}

// 신고 접수
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, reason, detail } = req.body;
    if (!TARGET_TYPES.includes(targetType) || !targetId || !reason?.trim()) {
      res.status(400).json({ message: '신고 대상과 사유를 확인해주세요.' }); return;
    }
    const ownerId = await targetOwnerId(targetType, targetId);
    if (!ownerId) { res.status(404).json({ message: '신고 대상을 찾을 수 없습니다.' }); return; }
    if (ownerId === req.userId) { res.status(400).json({ message: '본인 콘텐츠는 신고할 수 없습니다.' }); return; }

    await prisma.report.upsert({
      where: { reporterId_targetType_targetId: { reporterId: req.userId!, targetType, targetId } },
      create: { reporterId: req.userId!, targetType, targetId, reason: reason.trim(), detail: detail?.trim() || null },
      update: { reason: reason.trim(), detail: detail?.trim() || null, status: 'pending' },
    });
    res.status(201).json({ message: '신고가 접수되었습니다. 24시간 이내에 검토 후 조치하겠습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
