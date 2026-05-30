export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  PRIVILEGE = 'PRIVILEGE',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  managerId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: LeaveStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  employeeId: string;
  CASUAL: number;
  SICK: number;
  PRIVILEGE: number;
}
