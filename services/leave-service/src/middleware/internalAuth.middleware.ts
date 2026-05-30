import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, UserRole } from '@leave-mgmt/shared';
import { config } from '../config';

// TODO: Remove Mode 2 (direct JWT) when API Gateway is added in Stage 9

interface JwtPayload {
  userId: string;
  role: UserRole;
  email?: string;
}

export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
  const internalSecret = req.headers['x-internal-secret'];

  if (internalSecret && internalSecret === config.internalSecret) {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];

    if (typeof userId === 'string' && typeof role === 'string') {
      if (role === UserRole.EMPLOYEE || role === UserRole.MANAGER) {
        req.user = { userId, role: role as UserRole };
        next();
        return;
      }
    }
  }

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

      if (payload.userId && payload.role) {
        if (payload.role === UserRole.EMPLOYEE || payload.role === UserRole.MANAGER) {
          req.user = { userId: payload.userId, role: payload.role };
          next();
          return;
        }
      }
    } catch {
      next(new AppError(401, 'Unauthorized'));
      return;
    }
  }

  next(new AppError(401, 'Unauthorized'));
}
