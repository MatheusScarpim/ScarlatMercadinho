import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as controller from '../controllers/settingsController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `brand-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato não suportado. Use: PNG, JPG, SVG, ICO ou WebP'));
    }
  },
});

const router = Router();

// Rota pública - necessária para carregar branding antes do login
router.get('/whitelabel', controller.getWhitelabel);

// Rotas protegidas
router.use(authMiddleware, requirePermission('SETTINGS'));
router.get('/margin', controller.getMargin);
router.put('/margin', controller.updateMargin);
router.put('/whitelabel', controller.updateWhitelabel);
router.post('/whitelabel/upload', upload.single('file'), controller.uploadBrandImage);

export default router;
