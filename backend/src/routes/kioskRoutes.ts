import { Router } from 'express';
import * as controller from '../controllers/kioskController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Todas as rotas exigem admin
router.use(authMiddleware, adminOnly);

// Recarrega todos os kiosks
router.post('/reload-all', controller.reloadAllKiosks);

// Recarrega kiosk de um local específico
router.post('/:id/reload', controller.reloadKiosk);

// Limpa cache e recarrega kiosk de um local específico
router.post('/:id/clear-reload', controller.clearCacheAndReload);

export default router;
