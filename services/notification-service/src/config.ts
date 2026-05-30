import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

const port = Number(process.env.PORT) || 3003;

export const config = {
  port,
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
  consulUrl: process.env.CONSUL_URL || 'http://localhost:8500',
};
