import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Todas as rotas de notificação requerem autenticação
router.use(authMiddleware);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/old', notificationController.deleteOld);
router.delete('/all', notificationController.deleteAll);

// Endpoint de teste (desenvolvimento)
router.post('/test/sale', notificationController.testSaleNotification);

export default router;
