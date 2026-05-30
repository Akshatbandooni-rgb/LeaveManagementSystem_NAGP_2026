import { Request, Response, NextFunction } from 'express';
import { AppError } from '@leave-mgmt/shared';

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      next(AppError.forbidden('Access denied'));
      return;
    }

    next();
  };
}
