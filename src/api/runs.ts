import client from './client';

export interface RunPayload {
  distance: number;
  duration: number;
  pace: string;
  calories: number;
  coordinates: { latitude: number; longitude: number }[];
  courseId?: string;
}

export const createRun = (data: RunPayload) =>
  client.post('/api/runs', data).then((r) => r.data.run);

export const getMyRuns = () =>
  client.get('/api/runs').then((r) => r.data.runs);

export const getMyStats = () =>
  client.get('/api/runs/stats').then((r) => r.data);
