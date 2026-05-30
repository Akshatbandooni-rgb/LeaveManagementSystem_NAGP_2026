import CircuitBreaker from 'opossum';
import { AppError } from '@leave-mgmt/shared';
import { logger } from './logger';

const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(serviceName: string): CircuitBreaker {
  const existing = breakers.get(serviceName);

  if (existing) {
    return existing;
  }

  const breaker = new CircuitBreaker(
    async <T>(action: () => Promise<T>) => action(),
    {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 5,
    },
  );

  breaker.on('open', () => {
    logger.warn({ serviceName }, 'Circuit breaker OPENED');
  });

  breaker.on('halfOpen', () => {
    logger.info({ serviceName }, 'Circuit breaker HALF-OPEN — testing');
  });

  breaker.on('close', () => {
    logger.info({ serviceName }, 'Circuit breaker CLOSED — service recovered');
  });

  breaker.fallback(() => {
    throw new AppError(
      503,
      `${serviceName} is temporarily unavailable. Please retry after 30 seconds`,
    );
  });

  breakers.set(serviceName, breaker);
  return breaker;
}

export function getAllCircuitStates(): Record<string, string> {
  const states: Record<string, string> = {};

  for (const [name, breaker] of breakers.entries()) {
    if (breaker.opened) {
      states[name] = 'open';
    } else if (breaker.halfOpen) {
      states[name] = 'halfOpen';
    } else {
      states[name] = 'closed';
    }
  }

  return states;
}
