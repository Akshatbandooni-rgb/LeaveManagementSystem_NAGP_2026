import './types/express';
import express from 'express';
import { config } from './config';
import { logger } from './lib/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { errorHandler } from './middleware/errorHandler.middleware';

const app = express();

app.use(express.json());
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/auth/login', authRoutes);
app.use('/users', userRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`User service running on port ${config.port}`);
});
