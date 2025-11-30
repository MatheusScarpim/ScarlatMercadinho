import { Router } from 'express';
import * as controller from '../controllers/customerController';

const router = Router();

router.post('/upsert', controller.upsertCustomer);

export default router;
