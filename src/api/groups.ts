import client from './client';

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  inviteCode: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  _count: { members: number };
  members?: { role: string }[];
}

export interface GroupDetail {
  group: Group;
  isMember: boolean;
  myRole: 'admin' | 'member' | null;
  members: { userId: string; name: string; role: string; distance: number; runs: number }[];
  weeklyStats: { totalDistance: number; totalRuns: number; activeMembers: number };
  recentRuns: any[];
}

export const getGroups = (): Promise<{ myGroups: Group[]; publicGroups: Group[] }> =>
  client.get('/api/groups').then((r) => r.data);

export const createGroup = (data: { name: string; description?: string; isPublic?: boolean }): Promise<Group> =>
  client.post('/api/groups', data).then((r) => r.data.group);

export const getGroupDetail = (id: string): Promise<GroupDetail> =>
  client.get(`/api/groups/${id}`).then((r) => r.data);

export const joinGroup = (id: string): Promise<void> =>
  client.post(`/api/groups/${id}/join`).then(() => undefined);

export const joinGroupByCode = (inviteCode: string): Promise<{ group: { id: string; name: string } }> =>
  client.post('/api/groups/join-by-code', { inviteCode }).then((r) => r.data);

export const leaveGroup = (id: string): Promise<void> =>
  client.delete(`/api/groups/${id}/leave`).then(() => undefined);

export const getGroupPosts = (id: string): Promise<{ posts: any[] }> =>
  client.get(`/api/groups/${id}/posts`).then((r) => r.data);
