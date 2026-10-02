import client from './client';

export type ReportTargetType = 'post' | 'comment' | 'user';

export const REPORT_REASONS = ['스팸·광고', '욕설·비방·혐오', '음란·선정적 내용', '폭력·위협', '개인정보 노출', '기타'] as const;

export const reportContent = (targetType: ReportTargetType, targetId: string, reason: string, detail?: string) =>
  client.post('/api/reports', { targetType, targetId, reason, detail }).then((r) => r.data.message as string);
