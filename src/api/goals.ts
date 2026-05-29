import client from './client';

export interface GoalData {
  goal: { weeklyDistance: number; monthlyDistance: number } | null;
  progress: { weeklyDistance: number; monthlyDistance: number };
}

export const getGoal = (): Promise<GoalData> =>
  client.get('/api/goals').then((r) => r.data);

export const setGoal = (weeklyDistance: number, monthlyDistance: number) =>
  client.put('/api/goals', { weeklyDistance, monthlyDistance }).then((r) => r.data.goal);
