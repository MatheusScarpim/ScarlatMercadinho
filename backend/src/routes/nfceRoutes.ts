import { Router } from 'express';
import { getNfce, getFiscalOverview, exportFiscalSummary } from '../controllers/nfceController';

const router = Router();

router.get('/', getNfce);
router.get('/fiscal', getFiscalOverview);
router.get('/fiscal/export', exportFiscalSummary);

export default router;
