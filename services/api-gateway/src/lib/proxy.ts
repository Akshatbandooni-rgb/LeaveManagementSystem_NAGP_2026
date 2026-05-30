import axios, { AxiosResponse } from 'axios';
import { NextFunction, Request, Response } from 'express';
import { getCircuitBreaker } from './circuitBreaker';
import * as serviceRegistry from './serviceRegistry';

export async function proxyRequest(
  serviceName: string,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const serviceUrl = await serviceRegistry.resolveService(serviceName);
    const targetUrl = `${serviceUrl}${req.originalUrl}`;
    const breaker = getCircuitBreaker(serviceName);

    const response = (await breaker.fire(async () =>
      axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.outgoingHeaders,
          'content-type': 'application/json',
        },
        validateStatus: () => true,
      }),
    )) as AxiosResponse;

    res.status(response.status).json(response.data);
  } catch (err) {
    next(err);
  }
}
