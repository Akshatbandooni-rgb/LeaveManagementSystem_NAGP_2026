import { v4 as uuidv4 } from 'uuid';
import { LeaveRequest, LeaveStatus } from '@leave-mgmt/shared';

const leaveStore = new Map<string, LeaveRequest>();

export function findById(id: string): LeaveRequest | undefined {
  return leaveStore.get(id);
}

export function findByEmployeeId(employeeId: string): LeaveRequest[] {
  return Array.from(leaveStore.values()).filter((leave) => leave.employeeId === employeeId);
}

export function findByManagerId(managerId: string): LeaveRequest[] {
  return Array.from(leaveStore.values()).filter((leave) => leave.managerId === managerId);
}

export function findByManagerIdAndStatus(
  managerId: string,
  status?: LeaveStatus,
  employeeId?: string,
  fromDate?: string,
  toDate?: string,
): LeaveRequest[] {
  let results = Array.from(leaveStore.values()).filter((leave) => leave.managerId === managerId);

  if (status !== undefined) {
    results = results.filter((leave) => leave.status === status);
  }

  if (employeeId !== undefined) {
    results = results.filter((leave) => leave.employeeId === employeeId);
  }

  if (fromDate !== undefined) {
    results = results.filter((leave) => leave.startDate >= fromDate);
  }

  if (toDate !== undefined) {
    results = results.filter((leave) => leave.endDate <= toDate);
  }

  return results;
}

export function hasOverlap(employeeId: string, startDate: string, endDate: string): boolean {
  return Array.from(leaveStore.values()).some((existing) => {
    if (existing.employeeId !== employeeId) {
      return false;
    }

    if (existing.status === LeaveStatus.REJECTED || existing.status === LeaveStatus.CANCELLED) {
      return false;
    }

    return existing.startDate <= endDate && startDate <= existing.endDate;
  });
}

export function save(
  data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
): LeaveRequest {
  const now = new Date().toISOString();
  const leave: LeaveRequest = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  leaveStore.set(leave.id, leave);
  return leave;
}

export function update(
  id: string,
  updates: Partial<Pick<LeaveRequest, 'status' | 'rejectionReason'>>,
): LeaveRequest | undefined {
  const existing = leaveStore.get(id);

  if (!existing) {
    return undefined;
  }

  const updated: LeaveRequest = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  leaveStore.set(id, updated);
  return updated;
}
