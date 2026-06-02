import {
  AppError,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '@leave-mgmt/shared';
import {
  publishLeaveApplied,
  publishLeaveApproved,
  publishLeaveRejected,
} from '../lib/rabbitmq';
import * as balanceRepo from '../repositories/balance.repository';
import * as leaveRepo from '../repositories/leave.repository';

export async function applyLeave(input: {
  employeeId: string;
  managerId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  correlationId: string;
}): Promise<LeaveRequest> {
  const today = new Date().toISOString().split('T')[0];

  if (input.startDate < today) {
    throw new AppError(400, 'Start date cannot be in the past');
  }

  if (input.startDate > input.endDate) {
    throw new AppError(400, 'Start date must be before or equal to end date');
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  const calculatedDays =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;


  if (input.numberOfDays !== calculatedDays) {
    throw new AppError(
      400,
      `numberOfDays must be ${calculatedDays} for the selected date range`
    );
  }

  const balance = balanceRepo.findByEmployeeId(input.employeeId);

  if (!balance) {
    throw new AppError(404, 'Leave balance not found for employee');
  }

  if (balance[input.leaveType] < input.numberOfDays) {
    throw new AppError(422, 'Insufficient leave balance', {
      available: balance[input.leaveType],
      requested: input.numberOfDays,
      leaveType: input.leaveType,
    });
  }

  if (leaveRepo.hasOverlap(input.employeeId, input.startDate, input.endDate)) {
    throw new AppError(409, 'An overlapping leave request already exists for this period');
  }

  const saved = leaveRepo.save({
    employeeId: input.employeeId,
    managerId: input.managerId,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    numberOfDays: input.numberOfDays,
    reason: input.reason,
    status: LeaveStatus.PENDING,
  });

  publishLeaveApplied({
    eventType: 'leave.applied',
    leaveRequest: saved,
    managerId: input.managerId,
    correlationId: input.correlationId,
  });

  return saved;
}

export async function approveLeave(input: {
  leaveId: string;
  managerId: string;
  correlationId: string;
}): Promise<LeaveRequest> {
  const leave = leaveRepo.findById(input.leaveId);

  if (!leave) {
    throw new AppError(404, 'Leave request not found');
  }

  if (leave.managerId !== input.managerId) {
    throw new AppError(403, 'Access denied');
  }

  if (leave.status !== LeaveStatus.PENDING) {
    throw new AppError(409, 'Leave request is not in Pending status');
  }

  const deductResult = balanceRepo.deductBalance(
    leave.employeeId,
    leave.leaveType,
    leave.numberOfDays,
  );

  if (!deductResult.success) {
    throw new AppError(422, 'Insufficient leave balance');
  }

  const updated = leaveRepo.update(input.leaveId, { status: LeaveStatus.APPROVED });

  publishLeaveApproved({
    eventType: 'leave.approved',
    leaveRequest: updated!,
    employeeId: leave.employeeId,
    correlationId: input.correlationId,
  });

  return updated!;
}

export async function rejectLeave(input: {
  leaveId: string;
  managerId: string;
  rejectionReason: string;
  correlationId: string;
}): Promise<LeaveRequest> {
  const leave = leaveRepo.findById(input.leaveId);

  if (!leave) {
    throw new AppError(404, 'Leave request not found');
  }

  if (leave.managerId !== input.managerId) {
    throw new AppError(403, 'Access denied');
  }

  if (leave.status !== LeaveStatus.PENDING) {
    throw new AppError(409, 'Leave request is not in Pending status');
  }

  const updated = leaveRepo.update(input.leaveId, {
    status: LeaveStatus.REJECTED,
    rejectionReason: input.rejectionReason,
  });

  publishLeaveRejected({
    eventType: 'leave.rejected',
    leaveRequest: updated!,
    employeeId: leave.employeeId,
    rejectionReason: input.rejectionReason,
    correlationId: input.correlationId,
  });

  return updated!;
}

export function getMyHistory(
  employeeId: string,
  filters: { page: number; limit: number; status?: LeaveStatus },
): { data: LeaveRequest[]; total: number; page: number; limit: number } {
  let results = leaveRepo.findByEmployeeId(employeeId);

  if (filters.status !== undefined) {
    results = results.filter((leave) => leave.status === filters.status);
  }

  results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = results.length;
  const data = results.slice(
    (filters.page - 1) * filters.limit,
    filters.page * filters.limit,
  );

  return {
    data,
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

export function getPendingForManager(
  managerId: string,
  filters: {
    status?: LeaveStatus;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
  },
): LeaveRequest[] {
  return leaveRepo.findByManagerIdAndStatus(
    managerId,
    filters.status,
    filters.employeeId,
    filters.fromDate,
    filters.toDate,
  );
}
