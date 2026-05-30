import './types/express';
import express from 'express';
import { config } from './config';
import { logger } from './lib/logger';
import { correlationId } from './middleware/correlationId.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { initializeBalance } from './repositories/balance.repository';
import balanceRoutes from './routes/balance.routes';
import leaveRoutes from './routes/leave.routes';

const app = express();

app.use(express.json());
app.use(correlationId);

initializeBalance('emp-001');
initializeBalance('emp-002');

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'leave-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/leaves', leaveRoutes);
app.use('/balances', balanceRoutes);
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

const server = app.listen(config.port, (err?: Error) => {
  if (err) {
    logger.error({ err, port: config.port }, 'Failed to start leave service');
    process.exit(1);
  }

  logger.info(`Leave service running on port ${config.port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  logger.error({ err, port: config.port }, 'Server error');
  process.exit(1);
});
