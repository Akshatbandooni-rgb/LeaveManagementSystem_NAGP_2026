import { z } from 'zod';
import { UserRole } from '@leave-mgmt/shared';

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  managerId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
