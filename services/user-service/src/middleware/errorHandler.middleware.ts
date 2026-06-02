import { ErrorRequestHandler } from 'express';
import { AppError } from '@leave-mgmt/shared';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    logger.error({ err, correlationId: (req.headers['x-correlation-id'] as string) || 'none' }, 'Operational error');
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
      correlationId: (req.headers['x-correlation-id'] as string) || 'none',
    });
    return;
  }

  logger.error(
    { err, correlationId: (req.headers['x-correlation-id'] as string) || 'none' },
    'Unhandled error',
  );
  res.status(500).json({ error: 'Internal server error' });
};
