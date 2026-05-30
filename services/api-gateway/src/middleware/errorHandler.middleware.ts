import { ErrorRequestHandler } from 'express';
import { AppError } from '@leave-mgmt/shared';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
      correlationId: req.correlationId || 'none',
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    correlationId: req.correlationId || 'none',
  });
};
