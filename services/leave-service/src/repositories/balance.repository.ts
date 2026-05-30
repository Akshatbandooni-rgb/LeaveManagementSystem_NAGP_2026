import { DEFAULT_LEAVE_ALLOCATION } from '@leave-mgmt/shared';
import { LeaveBalance, LeaveType } from '@leave-mgmt/shared';

const balanceStore = new Map<string, LeaveBalance>();

export function initializeBalance(employeeId: string): LeaveBalance {
  const existing = balanceStore.get(employeeId);
  if (existing) {
    return existing;
  }

  const balance: LeaveBalance = {
    employeeId,
    CASUAL: DEFAULT_LEAVE_ALLOCATION.CASUAL,
    SICK: DEFAULT_LEAVE_ALLOCATION.SICK,
    PRIVILEGE: DEFAULT_LEAVE_ALLOCATION.PRIVILEGE,
  };

  balanceStore.set(employeeId, balance);
  return balance;
}

export function findByEmployeeId(employeeId: string): LeaveBalance | undefined {
  return balanceStore.get(employeeId);
}

/**
 * SYNCHRONOUS BY DESIGN — DO NOT ADD AWAIT HERE
 * Node.js processes one callback at a time. By keeping this entire
 * read-check-deduct-write sequence synchronous, no other operation
 * can interleave between our balance check and our balance write.
 * If we added await anywhere here, two concurrent approve requests
 * could both read sufficient balance before either writes the deduction.
 */
export function deductBalance(
  employeeId: string,
  leaveType: LeaveType,
  days: number,
): { success: boolean; newBalance?: LeaveBalance } {
  const balance = balanceStore.get(employeeId);

  if (!balance) {
    return { success: false };
  }

  if (balance[leaveType] < days) {
    return { success: false };
  }

  const updated: LeaveBalance = {
    ...balance,
    [leaveType]: balance[leaveType] - days,
  };

  balanceStore.set(employeeId, updated);
  return { success: true, newBalance: { ...updated } };
}
