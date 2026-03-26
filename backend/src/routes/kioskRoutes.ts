import { Router } from 'express';
import * as controller from '../controllers/kioskController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Rota pública - o kiosk consulta se precisa recarregar (polling)
router.get('/check-reload/:code', controller.checkReload);

// Rotas admin - solicitar reload
router.post('/reload-all', authMiddleware, adminOnly, controller.requestReloadAll);
router.post('/:id/reload', authMiddleware, adminOnly, controller.requestReload);

export default router;
