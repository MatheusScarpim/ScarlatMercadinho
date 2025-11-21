import { Router } from 'express';
import * as controller from '../controllers/purchaseController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.get);

export default router;
