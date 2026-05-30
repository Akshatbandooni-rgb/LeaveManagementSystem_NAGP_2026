import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@leave-mgmt/shared';
import { config } from '../config';

const PUBLIC_PATHS = [
  { method: 'POST', path: '/auth/login' },
  { method: 'GET', path: '/health' },
];

function isPublicRoute(req: Request): boolean {
  return PUBLIC_PATHS.some(
    (route) => route.method === req.method && route.path === req.path,
  );
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  if (isPublicRoute(req)) {
    next();
    return;
  }

  const authorization = req.headers.authorization;

  if (!authorization) {
    next(new AppError(401, 'Authorization token required'));
    return;
  }

  if (!authorization.startsWith('Bearer ')) {
    next(new AppError(401, 'Invalid authorization format'));
    return;
  }

  const token = authorization.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      role: string;
      email: string;
    };

    req.jwtPayload = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token has expired'));
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid token'));
      return;
    }

    next(err);
  }
}
