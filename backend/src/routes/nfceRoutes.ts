import { Router } from 'express';
import { getNfce } from '../controllers/nfceController';

const router = Router();

router.get('/', getNfce);

export default router;
