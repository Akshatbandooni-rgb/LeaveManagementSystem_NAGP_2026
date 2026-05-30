import axios from 'axios';
import { AppError } from '@leave-mgmt/shared';
import { config } from '../config';
import { logger } from './logger';

const fallbackServiceMap: Record<string, string> = {
  'user-service': 'http://localhost:3001',
  'leave-service': 'http://localhost:3002',
  'notification-service': 'http://localhost:3003',
};

interface ConsulHealthService {
  Service: {
    Address: string;
    Port: number;
  };
}

export async function resolveService(name: string): Promise<string> {
  try {
    const response = await axios.get<ConsulHealthService[]>(
      `${config.consulUrl}/v1/health/service/${name}?passing=true`,
    );

    if (!response.data.length) {
      throw new AppError(503, `${name} has no healthy instances`);
    }

    const instance = response.data[0];
    return `http://${instance.Service.Address}:${instance.Service.Port}`;
  } catch {
    logger.warn(`Consul lookup failed for ${name}, using fallback`);

    const fallback = fallbackServiceMap[name];

    if (!fallback) {
      throw new AppError(503, `Unknown service: ${name}`);
    }

    return fallback;
  }
}
