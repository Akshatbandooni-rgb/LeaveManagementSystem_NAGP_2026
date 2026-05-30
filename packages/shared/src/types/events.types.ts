import type { LeaveRequest } from './leave.types';
import type { UserRole } from './user.types';

export interface UserCreatedEvent {
  eventType: 'user.created';
  userId: string;
  role: UserRole;
  correlationId: string;
}

export interface LeaveAppliedEvent {
  eventType: 'leave.applied';
  leaveRequest: LeaveRequest;
  managerId: string;
  correlationId: string;
}

export interface LeaveApprovedEvent {
  eventType: 'leave.approved';
  leaveRequest: LeaveRequest;
  employeeId: string;
  correlationId: string;
}

export interface LeaveRejectedEvent {
  eventType: 'leave.rejected';
  leaveRequest: LeaveRequest;
  employeeId: string;
  rejectionReason: string;
  correlationId: string;
}
