import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// 게시글 목록
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const posts = await prisma.post.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 30,
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

// 게시글 작성
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, title, content } = req.body;
    if (!category || !title?.trim() || !content?.trim()) {
      res.status(400).json({ message: '카테고리, 제목, 내용을 모두 입력해주세요.' }); return;
    }
    const post = await prisma.post.create({
      data: { userId: req.userId!, category, title: title.trim(), content: content.trim() },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });
    res.status(201).json({ post });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 게시글 상세 + 댓글
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { likes: true } },
      },
    });
    if (!post) { res.status(404).json({ message: '게시글을 찾을 수 없습니다.' }); return; }

    const isLiked = !!(await prisma.postLike.findUnique({
      where: { postId_userId: { postId: req.params.id, userId: req.userId! } },
    }));

    res.json({ post, isLiked });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 댓글 작성
router.post('/:id/comments', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ message: '댓글 내용을 입력해주세요.' }); return; }
    const comment = await prisma.comment.create({
      data: { postId: req.params.id, userId: req.userId!, content: content.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json({ comment });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 좋아요 토글
router.post('/:id/like', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = { postId: req.params.id, userId: req.userId! };
    const existing = await prisma.postLike.findUnique({ where: { postId_userId: key } });
    if (existing) {
      await prisma.postLike.delete({ where: { postId_userId: key } });
      res.json({ liked: false });
    } else {
      await prisma.postLike.create({ data: key });
      res.json({ liked: true });
    }
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 게시글 삭제 (본인만)
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) { res.status(404).json({ message: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.userId) { res.status(403).json({ message: '권한이 없습니다.' }); return; }
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: '삭제되었습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
