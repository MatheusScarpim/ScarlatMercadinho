import { Router } from 'express';
import * as controller from '../controllers/settingsController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.get('/margin', controller.getMargin);
router.put('/margin', controller.updateMargin);

export default router;
