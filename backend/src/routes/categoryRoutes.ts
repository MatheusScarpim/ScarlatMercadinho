import { Router } from 'express';
import * as controller from '../controllers/categoryController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, requirePermission('CATEGORIES'), controller.createCategory);
router.get('/', controller.listCategories);
router.get('/:id', controller.getCategory);
router.put('/:id', authMiddleware, requirePermission('CATEGORIES'), controller.updateCategory);
router.delete('/:id', authMiddleware, requirePermission('CATEGORIES'), controller.deleteCategory);

export default router;
