import { Request, Response, NextFunction } from 'express';
import * as balanceService from '../services/balance.service';

export function getMyBalance(req: Request, res: Response, next: NextFunction): void {
  try {
    const balance = balanceService.getMyBalance(req.user!.userId);
    res.status(200).json(balance);
  } catch (err) {
    next(err);
  }
}
