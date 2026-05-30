import { Router } from 'express';
import { proxyRequest } from '../lib/proxy';

const router = Router();

router.use('/auth', (req, res, next) => {
  proxyRequest('user-service', req, res, next);
});

router.use('/users', (req, res, next) => {
  proxyRequest('user-service', req, res, next);
});

router.use('/leaves', (req, res, next) => {
  proxyRequest('leave-service', req, res, next);
});

router.use('/balances', (req, res, next) => {
  proxyRequest('leave-service', req, res, next);
});

export default router;
