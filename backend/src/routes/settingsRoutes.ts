import { Router } from 'express';
import * as controller from '../controllers/settingsController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware, requirePermission('SETTINGS'));
router.get('/margin', controller.getMargin);
router.put('/margin', controller.updateMargin);

export default router;
