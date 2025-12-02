import { Router } from 'express';
import * as controller from '../controllers/batchController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware, requirePermission('EXPIRING_PRODUCTS'));

// Lista lotes próximos do vencimento
router.get('/expiring', controller.listExpiringBatches);

// Atualiza preços de todos os lotes
router.post('/update-prices', controller.updateBatchPrices);

// Migra lotes antigos (adiciona originalSalePrice)
router.post('/migrate', controller.migrateBatches);

// Obtém contagem de produtos críticos
router.get('/critical-count', controller.getCriticalCount);

// Busca melhor preço de um produto
router.get('/product/:productId/price', controller.getProductPrice);

// Lista todos os lotes de um produto
router.get('/product/:productId', controller.listProductBatches);

// Atualiza desconto de um lote específico
router.patch('/:id/discount', controller.updateBatchDiscount);

export default router;
