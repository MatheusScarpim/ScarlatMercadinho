import { Router } from 'express';
import * as userController from '../controllers/userController';
import { adminOnly, authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware, adminOnly);
router.post('/', userController.createUser);
router.get('/', userController.listUsers);
router.get('/permissions/options', userController.listPermissionOptions);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
