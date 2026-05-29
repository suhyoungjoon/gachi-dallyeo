import client from './client';

export const getMyProfile = () =>
  client.get('/api/users/me').then((r) => r.data);

export const updateMyName = (name: string) =>
  client.patch('/api/users/me', { name }).then((r) => r.data.user);

export const getFeed = () =>
  client.get('/api/users/feed').then((r) => r.data.runs);

export const followUser = (id: string) =>
  client.post(`/api/users/${id}/follow`).then((r) => r.data);

export const unfollowUser = (id: string) =>
  client.delete(`/api/users/${id}/follow`).then((r) => r.data);

export const searchUsers = (q: string) =>
  client.get('/api/users/search', { params: { q } }).then((r) => r.data.users);
