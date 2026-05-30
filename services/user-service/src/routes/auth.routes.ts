import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { loginSchema } from '../validators/auth.validators';

const router = Router();

router.post('/', validate(loginSchema), login);

export default router;
