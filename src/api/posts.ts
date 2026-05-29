import client from './client';

export const getPosts = (category?: string) =>
  client.get('/api/posts', { params: category ? { category } : {} }).then((r) => r.data.posts);

export const createPost = (data: { category: string; title: string; content: string }) =>
  client.post('/api/posts', data).then((r) => r.data.post);

export const getPostDetail = (id: string) =>
  client.get(`/api/posts/${id}`).then((r) => r.data);

export const addComment = (postId: string, content: string) =>
  client.post(`/api/posts/${postId}/comments`, { content }).then((r) => r.data.comment);

export const toggleLike = (postId: string) =>
  client.post(`/api/posts/${postId}/like`).then((r) => r.data);

export const deletePost = (id: string) =>
  client.delete(`/api/posts/${id}`).then((r) => r.data);
