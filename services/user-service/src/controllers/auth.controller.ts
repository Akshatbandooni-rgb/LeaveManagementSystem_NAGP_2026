import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export function login(req: Request, res: Response, next: NextFunction): void {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
