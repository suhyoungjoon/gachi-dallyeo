import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import runRoutes from './routes/runs';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import postRoutes from './routes/posts';
import goalRoutes from './routes/goals';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/goals', goalRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
