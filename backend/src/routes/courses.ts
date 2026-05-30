import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// 코스 목록
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { runs: true } },
      },
    });
    res.json({ courses });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 코스 생성
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, distance, description, coordinates } = req.body;
    if (!name?.trim() || !distance) { res.status(400).json({ message: '코스명과 거리를 입력해주세요.' }); return; }
    const course = await prisma.course.create({
      data: { name: name.trim(), distance: Number(distance), description, coordinates: coordinates ?? [], createdById: req.userId! },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { runs: true } },
      },
    });
    res.status(201).json({ course });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 코스 상세 + 리더보드
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!course) { res.status(404).json({ message: '코스를 찾을 수 없습니다.' }); return; }

    const leaderboard = await prisma.run.findMany({
      where: { courseId: req.params.id },
      orderBy: { duration: 'asc' },
      take: 20,
      include: { user: { select: { id: true, name: true } } },
    });

    const myBest = await prisma.run.findFirst({
      where: { courseId: req.params.id, userId: req.userId },
      orderBy: { duration: 'asc' },
    });

    res.json({ course, leaderboard, myBest });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
