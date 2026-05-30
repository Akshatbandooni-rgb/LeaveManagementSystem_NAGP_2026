import pino from 'pino';

export const logger = pino({
  base: { service: 'user-service' },
});
