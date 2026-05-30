import { initTracing } from './lib/tracing';
initTracing('api-gateway');

import './types/express';
import express from 'express';
import { config } from './config';
import { getAllCircuitStates } from './lib/circuitBreaker';
import { logger } from './lib/logger';
import { auth } from './middleware/auth.middleware';
import { correlationId } from './middleware/correlationId.middleware';
import { enrichRequest } from './middleware/enrichRequest.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import proxyRoutes from './routes/proxy.routes';

const app = express();

app.use(express.json());
app.use(correlationId);
app.use(auth);
app.use(enrichRequest);
app.use(proxyRoutes);
app.use(errorHandler);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    circuits: getAllCircuitStates(),
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

const server = app.listen(config.port, (err?: Error) => {
  if (err) {
    logger.error({ err, port: config.port }, 'Failed to start API Gateway');
    process.exit(1);
    return;
  }

  logger.info(`API Gateway running on port ${config.port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  logger.error({ err, port: config.port }, 'Server error');
  process.exit(1);
});
