import { Request, Response, NextFunction } from 'express';
import { LeaveStatus, LeaveType } from '@leave-mgmt/shared';
import * as leaveService from '../services/leave.service';
import {
  historyQuerySchema,
  managerQuerySchema,
} from '../validators/leave.validators';

export async function applyLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { leaveType, startDate, endDate, numberOfDays, reason, managerId } = req.body as {
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      numberOfDays: number;
      reason: string;
      managerId: string;
    };

    const result = await leaveService.applyLeave({
      employeeId: req.user!.userId,
      managerId,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason,
      correlationId: req.correlationId!,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function approveLeave(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const leaveId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const result = await leaveService.approveLeave({
      leaveId,
      managerId: req.user!.userId,
      correlationId: req.correlationId!,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function rejectLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leaveId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { rejectionReason } = req.body as { rejectionReason: string };

    const result = await leaveService.rejectLeave({
      leaveId,
      managerId: req.user!.userId,
      rejectionReason,
      correlationId: req.correlationId!,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export function getMyHistory(req: Request, res: Response, next: NextFunction): void {
  try {
    const query = historyQuerySchema.parse(req.query);

    const result = leaveService.getMyHistory(req.user!.userId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export function getPendingForManager(req: Request, res: Response, next: NextFunction): void {
  try {
    const query = managerQuerySchema.parse(req.query);

    const result = leaveService.getPendingForManager(req.user!.userId, {
      status: query.status,
      employeeId: query.employeeId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
