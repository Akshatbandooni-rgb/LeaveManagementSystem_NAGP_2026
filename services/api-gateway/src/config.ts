import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

const port = Number(process.env.PORT) || 3000;
const jwtSecret = process.env.JWT_SECRET;
const internalSecret = process.env.INTERNAL_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (!internalSecret) {
  throw new Error('INTERNAL_SECRET environment variable is required');
}

export const config = {
  port,
  jwtSecret,
  internalSecret,
  consulUrl: process.env.CONSUL_URL || 'http://localhost:8500',
};
