import { Router } from 'express';
import * as controller from '../controllers/categoryController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, controller.createCategory);
router.get('/', controller.listCategories);
router.get('/:id', controller.getCategory);
router.put('/:id', authMiddleware, controller.updateCategory);
router.delete('/:id', authMiddleware, controller.deleteCategory);

export default router;
