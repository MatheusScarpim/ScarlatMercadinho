import { Router } from 'express';
import * as controller from '../controllers/locationController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware, adminOnly);
router.post('/', controller.createLocation);
router.get('/', controller.listLocations);
router.get('/:id', controller.getLocation);
router.put('/:id', controller.updateLocation);
router.delete('/:id', controller.deleteLocation);

export default router;
