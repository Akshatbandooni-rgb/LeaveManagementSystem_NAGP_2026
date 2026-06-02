import dotenv from 'dotenv';
import path from 'path/win32';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env')
});

const port = Number(process.env.PORT) || 3001;


const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const internalSecret = process.env.INTERNAL_SECRET;

export const config = {
  port,
  jwtSecret,
  internalSecret,
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
  consulUrl: process.env.CONSUL_URL || 'http://localhost:8500',
};
