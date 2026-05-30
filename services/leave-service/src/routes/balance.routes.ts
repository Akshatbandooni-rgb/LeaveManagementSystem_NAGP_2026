import { Router } from 'express';
import { getMyBalance } from '../controllers/balance.controller';
import { internalAuth } from '../middleware/internalAuth.middleware';
import { requireRole } from '../middleware/requireRole.middleware';

const router = Router();

router.get('/my-balance', internalAuth, requireRole('EMPLOYEE'), getMyBalance);

export default router;
