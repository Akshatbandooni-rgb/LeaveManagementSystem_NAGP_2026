import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '@leave-mgmt/shared';
import { config } from '../config';
import * as userRepository from '../repositories/user.repository';

export interface LoginResult {
  token: string;
  userId: string;
  role: string;
  expiresIn: string;
}

export function login(email: string, password: string): LoginResult {
  const user = userRepository.findByEmail(email);

  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  const passwordValid = bcrypt.compareSync(password, user.passwordHash);

  if (!passwordValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: '8h' },
  );

  return {
    token,
    userId: user.id,
    role: user.role,
    expiresIn: '8h',
  };
}
