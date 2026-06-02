import { Router } from 'express';
import { create, getAll, getById } from '../controllers/user.controller';
import { internalAuth } from '../middleware/internalAuth.middleware';
import { requireRole } from '../middleware/requireRole.middleware';
import { validate } from '../middleware/validate.middleware';
import { createUserSchema } from '../validators/user.validators';

const router = Router();

router.get('/', internalAuth, requireRole('MANAGER'), getAll);
router.get('/:id', internalAuth, getById);
router.post('/', internalAuth, requireRole('MANAGER'), validate(createUserSchema), create);

export default router;
