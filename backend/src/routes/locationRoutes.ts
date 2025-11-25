import { Router } from 'express';
import * as controller from '../controllers/locationController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Listar/consultar locais não exige login (usado no quiosque)
router.get('/', controller.listLocations);
router.get('/:id', controller.getLocation);

// Demais operações continuam restritas
router.post('/', authMiddleware, adminOnly, controller.createLocation);
router.put('/:id', authMiddleware, adminOnly, controller.updateLocation);
router.delete('/:id', authMiddleware, adminOnly, controller.deleteLocation);

export default router;
