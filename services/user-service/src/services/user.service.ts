import bcrypt from 'bcryptjs';
import { AppError, User, UserRole } from '@leave-mgmt/shared';
import { publishUserCreated } from '../lib/rabbitmq';
import * as userRepository from '../repositories/user.repository';
import { CreateUserInput } from '../validators/user.validators';

export type UserPublic = Omit<User, 'passwordHash'>;

function toPublic(user: User): UserPublic {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export function getUserById(id: string): UserPublic {
  const user = userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return toPublic(user);
}

export function getAllUsers(): UserPublic[] {
  return userRepository.findAll().map(toPublic);
}

export function createUser(data: CreateUserInput, correlationId = 'none'): UserPublic {
  if (userRepository.findByEmail(data.email)) {
    throw AppError.conflict('Email already in use');
  }

  const passwordHash = bcrypt.hashSync(data.password, 10);

  const user = userRepository.save({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    managerId: data.managerId,
  });

  if (user.role === UserRole.EMPLOYEE) {
    publishUserCreated({
      eventType: 'user.created',
      userId: user.id,
      role: user.role,
      correlationId,
    });
  }

  return toPublic(user);
}
