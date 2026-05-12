import { Router } from 'express';
import * as controller from '../controllers/calculatorController';

const router = Router();

router.post('/calculate', controller.calculate);
router.get('/history', controller.history);

export default router;
