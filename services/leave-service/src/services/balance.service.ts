import { AppError, LeaveBalance } from '@leave-mgmt/shared';
import * as balanceRepo from '../repositories/balance.repository';

export function getMyBalance(employeeId: string): LeaveBalance {
  const balance = balanceRepo.findByEmployeeId(employeeId);

  if (!balance) {
    throw new AppError(404, 'Leave balance not found');
  }

  return balance;
}
