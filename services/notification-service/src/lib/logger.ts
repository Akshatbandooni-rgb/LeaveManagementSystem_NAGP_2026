import pino from 'pino';

export const logger = pino({
  base: { service: 'notification-service' },
});
