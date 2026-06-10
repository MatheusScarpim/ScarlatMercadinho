import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as controller from '../controllers/locationController';
import { authMiddleware, adminOnly, requirePermission } from '../middlewares/auth';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `screen-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext) ? true : new Error('Use PNG, JPG ou WebP') as any);
  },
});

const router = Router();

// Listar/consultar locais não exige login (usado no quiosque)
router.get('/', controller.listLocations);

// Carregar local com credenciais da maquininha (somente admin) — usado no formulário de edição
router.get(
  '/:id/edit',
  authMiddleware,
  adminOnly,
  requirePermission('LOCATIONS'),
  controller.getLocationForEdit
);

router.get('/:id', controller.getLocation);

// Buscar maquininhas (Point devices) de uma conta pelo Access Token
router.post(
  '/devices/list',
  authMiddleware,
  adminOnly,
  requirePermission('LOCATIONS'),
  controller.listLocationDevices
);

// Upload de imagem de screensaver
router.post(
  '/upload',
  authMiddleware,
  adminOnly,
  requirePermission('LOCATIONS'),
  upload.single('file'),
  controller.uploadScreensaverImage
);

// Demais operações continuam restritas
router.post(
  '/',
  authMiddleware,
  adminOnly,
  requirePermission('LOCATIONS'),
  controller.createLocation
);
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  requirePermission('LOCATIONS'),
  controller.updateLocation
);
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  requirePermission('LOCATIONS'),
  controller.deleteLocation
);

export default router;
