import { PrismaClient } from '@prisma/client';

// 내가 차단한 사용자 + 나를 차단한 사용자 (양방향 모두 서로의 콘텐츠를 숨김)
export async function getHiddenUserIds(prisma: PrismaClient, userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));
}

// 내가 신고한 게시글/댓글 id (신고자에게는 즉시 숨김)
export async function getReportedIds(prisma: PrismaClient, userId: string, targetType: 'post' | 'comment'): Promise<string[]> {
  const reports = await prisma.report.findMany({
    where: { reporterId: userId, targetType },
    select: { targetId: true },
  });
  return reports.map((r) => r.targetId);
}
