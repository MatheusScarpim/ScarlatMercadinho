import { Router } from 'express';
import multer from 'multer';
import { getNfce, getFiscalOverview, exportFiscalSummary, importNfceXml } from '../controllers/nfceController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/', authMiddleware, requirePermission('NFC_E'), getNfce);
router.post(
  '/import-xml',
  authMiddleware,
  requirePermission('NFC_E'),
  upload.single('file'),
  importNfceXml,
);
router.get('/fiscal', authMiddleware, requirePermission('FISCAL'), getFiscalOverview);
router.get('/fiscal/export', authMiddleware, requirePermission('FISCAL'), exportFiscalSummary);

export default router;
