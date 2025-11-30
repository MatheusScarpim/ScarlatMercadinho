import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import unitRoutes from './routes/unitRoutes';
import categoryRoutes from './routes/categoryRoutes';
import supplierRoutes from './routes/supplierRoutes';
import productRoutes from './routes/productRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import stockMovementRoutes from './routes/stockMovementRoutes';
import saleRoutes from './routes/saleRoutes';
import notificationRoutes from './routes/notificationRoutes';
import metricsRoutes from './routes/metricsRoutes';
import locationRoutes from './routes/locationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import nfceRoutes from './routes/nfceRoutes';
import cosmosRoutes from './routes/cosmosRoutes';
import settingsRoutes from './routes/settingsRoutes';
import batchRoutes from './routes/batchRoutes';
import customerRoutes from './routes/customerRoutes';
import { createAdminSeed } from './services/authService';
import { startExpiryNotificationJob } from './jobs/expiryNotificationJob';
import { migrateBatchesWithSalePrice } from './services/batchService';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/units', unitRoutes);
app.use('/categories', categoryRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/products', productRoutes);
app.use('/purchases', purchaseRoutes);
app.use('/stock-movements', stockMovementRoutes);
app.use('/sales', saleRoutes);
app.use('/payments', paymentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/metrics', metricsRoutes);
app.use('/locations', locationRoutes);
app.use('/nfce', nfceRoutes);
app.use('/cosmos', cosmosRoutes);
app.use('/settings', settingsRoutes);
app.use('/batches', batchRoutes);
app.use('/customers', customerRoutes);

app.use(errorHandler);

async function bootstrap() {
  await connectDatabase();
  await createAdminSeed();

  // Migra lotes antigos para adicionar originalSalePrice
  console.log('[MIGRATION] Verificando lotes antigos...');
  try {
    const updated = await migrateBatchesWithSalePrice();
    if (updated > 0) {
      console.log(`[MIGRATION] ${updated} lotes migrados com sucesso`);
    } else {
      console.log('[MIGRATION] Nenhum lote precisou ser migrado');
    }
  } catch (error) {
    console.error('[MIGRATION] Erro ao migrar lotes:', error);
  }

  // Inicia o job de notificação de produtos próximos do vencimento
  startExpiryNotificationJob();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
