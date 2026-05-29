import client from './client';

export const getCourses = () =>
  client.get('/api/courses').then((r) => r.data.courses);

export const createCourse = (data: { name: string; distance: number; description?: string }) =>
  client.post('/api/courses', data).then((r) => r.data.course);

export const getCourseDetail = (id: string) =>
  client.get(`/api/courses/${id}`).then((r) => r.data);
