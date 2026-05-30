import express from 'express';
import { config } from './config';
import { logger } from './lib/logger';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler.middleware';

const app = express();

app.use(express.json());
app.use('/auth/login', authRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`User service running on port ${config.port}`);
});
