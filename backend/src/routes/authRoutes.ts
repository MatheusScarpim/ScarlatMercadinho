import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/bootstrap-admin', authController.bootstrapAdmin);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
