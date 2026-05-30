import { UserRole } from '@leave-mgmt/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
      };
      correlationId?: string;
    }
  }
}

export {};
