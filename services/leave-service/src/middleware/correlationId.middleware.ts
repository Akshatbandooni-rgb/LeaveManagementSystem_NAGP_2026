import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers['x-correlation-id'];
  const id = typeof headerId === 'string' && headerId.length > 0 ? headerId : uuidv4();

  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}
