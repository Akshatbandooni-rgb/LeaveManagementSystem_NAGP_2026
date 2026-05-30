import { Request, Response, NextFunction } from 'express';
import { AppError, UserRole } from '@leave-mgmt/shared';
import { config } from '../config';

export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
  const secret = req.headers['x-internal-secret'];

  if (!secret || secret !== config.internalSecret) {
    next(new AppError(401, 'Unauthorized'));
    return;
  }

  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (typeof userId !== 'string' || typeof role !== 'string') {
    next(new AppError(401, 'Unauthorized'));
    return;
  }

  if (role !== UserRole.EMPLOYEE && role !== UserRole.MANAGER) {
    next(new AppError(401, 'Unauthorized'));
    return;
  }

  req.user = { userId, role: role as UserRole };
  next();
}
