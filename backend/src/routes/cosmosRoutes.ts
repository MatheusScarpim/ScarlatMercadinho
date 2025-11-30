import { Router } from 'express';
import { getCosmosProduct, getAllGtinLookups } from '../controllers/cosmosController';

const router = Router();

router.get('/gtin-lookups', getAllGtinLookups);
router.get('/:ean', getCosmosProduct);

export default router;
