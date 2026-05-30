/// <reference path="../types/consul.d.ts" />
import Consul from 'consul';
import { config } from '../config';
import { logger } from './logger';

const consulClient = new Consul({
  host: new URL(config.consulUrl).hostname,
  port: new URL(config.consulUrl).port || '8500',
  promisify: true,
});

export async function registerService(): Promise<void> {
  const serviceHost = process.env.CONSUL_SERVICE_HOST || 'localhost';
  const healthCheckHost = process.env.CONSUL_SERVICE_HOST || 'host.docker.internal';

  try {
    await consulClient.agent.service.register({
      name: 'user-service',
      id: 'user-service-1',
      address: serviceHost,
      port: config.port,
      check: {
        http: `http://${healthCheckHost}:${config.port}/health`,
        interval: '10s',
        deregistercriticalserviceafter: '30s',
      },
    });

    logger.info('Registered with Consul');
  } catch (error) {
    logger.warn(`Failed to register with Consul: ${error}`);
  }
}

export async function deregisterService(): Promise<void> {
  try {
    await consulClient.agent.service.deregister('user-service-1');
    logger.info('Deregistered from Consul');
  } catch (error) {
    logger.warn(`Failed to deregister from Consul: ${error}`);
  }
}
