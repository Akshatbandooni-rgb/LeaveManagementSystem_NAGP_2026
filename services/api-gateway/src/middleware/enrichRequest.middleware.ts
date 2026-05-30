import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function enrichRequest(req: Request, _res: Response, next: NextFunction): void {
  if (req.jwtPayload) {
    req.outgoingHeaders = {
      'X-User-Id': req.jwtPayload.userId,
      'X-User-Role': req.jwtPayload.role,
      'X-Internal-Secret': config.internalSecret,
      'X-Correlation-Id': req.correlationId!,
    };
  } else {
    req.outgoingHeaders = {
      'X-Correlation-Id': req.correlationId!,
    };
  }

  delete req.headers.authorization;
  next();
}
