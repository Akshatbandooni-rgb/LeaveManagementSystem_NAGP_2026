import { z } from 'zod';
import { LeaveStatus, LeaveType } from '@leave-mgmt/shared';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const applyLeaveSchema = z.object({
  leaveType: z.nativeEnum(LeaveType),
  startDate: dateSchema,
  endDate: dateSchema,
  numberOfDays: z.number().int().positive(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  managerId: z.string().min(1, 'managerId is required'),
});

export const rejectLeaveSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason required'),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.nativeEnum(LeaveStatus).optional(),
});

export const managerQuerySchema = z.object({
  status: z.nativeEnum(LeaveStatus).optional(),
  employeeId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
