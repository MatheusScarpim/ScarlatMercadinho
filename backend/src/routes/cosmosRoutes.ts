import { Router } from 'express';
import { getCosmosProduct } from '../controllers/cosmosController';

const router = Router();

router.get('/:ean', getCosmosProduct);

export default router;
