import { AppError } from '@leave-mgmt/shared';

// TODO Stage 10: Replace with Consul dynamic discovery
const serviceMap: Record<string, string> = {
  'user-service': 'http://localhost:3001',
  'leave-service': 'http://localhost:3002',
  'notification-service': 'http://localhost:3003',
};

export function resolveService(name: string): string {
  const url = serviceMap[name];

  if (!url) {
    throw new AppError(503, `Unknown service: ${name}`);
  }

  return url;
}
