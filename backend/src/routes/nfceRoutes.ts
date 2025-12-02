import { Router } from 'express';
import { getNfce, getFiscalOverview, exportFiscalSummary } from '../controllers/nfceController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, requirePermission('NFC_E'), getNfce);
router.get('/fiscal', authMiddleware, requirePermission('FISCAL'), getFiscalOverview);
router.get('/fiscal/export', authMiddleware, requirePermission('FISCAL'), exportFiscalSummary);

export default router;
