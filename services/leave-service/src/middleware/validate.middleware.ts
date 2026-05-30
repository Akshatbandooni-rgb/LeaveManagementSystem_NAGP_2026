import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '@leave-mgmt/shared';

function formatFieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new AppError(400, 'Validation failed', formatFieldErrors(result.error)));
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(new AppError(400, 'Validation failed', formatFieldErrors(result.error)));
      return;
    }

    req.query = result.data as Request['query'];
    next();
  };
}
