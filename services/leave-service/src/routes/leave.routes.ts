import { Router } from 'express';
import {
  applyLeave,
  approveLeave,
  getMyHistory,
  getPendingForManager,
  rejectLeave,
} from '../controllers/leave.controller';
import { internalAuth } from '../middleware/internalAuth.middleware';
import { requireRole } from '../middleware/requireRole.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import {
  applyLeaveSchema,
  historyQuerySchema,
  managerQuerySchema,
  rejectLeaveSchema,
} from '../validators/leave.validators';

const router = Router();

router.use(internalAuth);

router.post('/', requireRole('EMPLOYEE'), validateBody(applyLeaveSchema), applyLeave);
router.get(
  '/my-requests',
  requireRole('EMPLOYEE'),
  validateQuery(historyQuerySchema),
  getMyHistory,
);
router.get(
  '/pending',
  requireRole('MANAGER'),
  validateQuery(managerQuerySchema),
  getPendingForManager,
);
router.patch('/:id/approve', requireRole('MANAGER'), approveLeave);
router.patch(
  '/:id/reject',
  requireRole('MANAGER'),
  validateBody(rejectLeaveSchema),
  rejectLeave,
);

export default router;
