import express from 'express';
import { config } from './config';
import { startConsumer } from './consumers/leave.consumer';
import { deregisterService, registerService } from './lib/consul';
import { logger } from './lib/logger';

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

startConsumer();

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

const server = app.listen(config.port, (err?: Error) => {
  if (err) {
    logger.error({ err, port: config.port }, 'Failed to start notification service');
    process.exit(1);
    return;
  }

  logger.info(`Notification service running on port ${config.port}`);
  registerService();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  logger.error({ err, port: config.port }, 'Server error');
  process.exit(1);
});

process.on('SIGTERM', () => {
  deregisterService().then(() => process.exit(0));
});
