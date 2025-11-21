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
import { createAdminSeed } from './services/authService';

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
app.use('/notifications', notificationRoutes);
app.use('/metrics', metricsRoutes);

app.use(errorHandler);

async function bootstrap() {
  await connectDatabase();
  await createAdminSeed();
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
