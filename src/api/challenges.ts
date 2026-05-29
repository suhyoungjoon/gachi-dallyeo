import client from './client';

export interface Challenge {
  id: string;
  title: string;
  targetDistance: number;
  startDate: string;
  endDate: string;
  createdBy: { id: string; name: string };
  _count: { participants: number };
}

export interface ChallengeListData {
  myChallenges: Challenge[];
  openChallenges: Challenge[];
  myProgress: Record<string, number>;
}

export interface LeaderboardEntry {
  user: { id: string; name: string };
  distance: number;
}

export interface ChallengeDetailData {
  challenge: Challenge & { participants: any[] };
  leaderboard: LeaderboardEntry[];
  isParticipating: boolean;
}

export const getChallenges = (): Promise<ChallengeListData> =>
  client.get('/api/challenges').then((r) => r.data);

export const createChallenge = (data: {
  title: string;
  targetDistance: number;
  startDate: string;
  endDate: string;
}): Promise<Challenge> =>
  client.post('/api/challenges', data).then((r) => r.data.challenge);

export const getChallengeDetail = (id: string): Promise<ChallengeDetailData> =>
  client.get(`/api/challenges/${id}`).then((r) => r.data);

export const joinChallenge = (id: string) =>
  client.post(`/api/challenges/${id}/join`).then((r) => r.data);

export const leaveChallenge = (id: string) =>
  client.delete(`/api/challenges/${id}/join`).then((r) => r.data);
