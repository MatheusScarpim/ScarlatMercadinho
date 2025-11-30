import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
  getExpiringBatches,
  updateAllBatchPrices,
  getBestPriceForProduct,
  getProductBatches,
  getCriticalBatchesCount,
  migrateBatchesWithSalePrice,
  updateBatchDiscountById
} from '../services/batchService';
import { Types } from 'mongoose';

export async function listExpiringBatches(req: AuthRequest, res: Response) {
  try {
    const daysThreshold = req.query.days ? parseInt(req.query.days as string) : 30;
    const batches = await getExpiringBatches(daysThreshold);
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao buscar lotes' });
  }
}

export async function updateBatchPrices(req: AuthRequest, res: Response) {
  try {
    const count = await updateAllBatchPrices();
    res.json({ message: `${count} lotes atualizados com sucesso`, count });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao atualizar preços' });
  }
}

export async function getProductPrice(req: AuthRequest, res: Response) {
  try {
    const { productId } = req.params;
    const location = (req.query.location as string) || 'default';

    const priceInfo = await getBestPriceForProduct(productId, location);
    res.json(priceInfo);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao buscar preço' });
  }
}

export async function listProductBatches(req: AuthRequest, res: Response) {
  try {
    const { productId } = req.params;
    const location = req.query.location as string | undefined;

    const batches = await getProductBatches(productId, location);
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao buscar lotes do produto' });
  }
}

export async function getCriticalCount(req: AuthRequest, res: Response) {
  try {
    const count = await getCriticalBatchesCount();
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao buscar contagem crítica' });
  }
}

export async function migrateBatches(req: AuthRequest, res: Response) {
  try {
    const updated = await migrateBatchesWithSalePrice();
    res.json({ message: `${updated} lotes atualizados com sucesso`, updated });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao migrar lotes' });
  }
}

export async function updateBatchDiscount(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { discountPercent } = req.body;

    if (discountPercent === undefined || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({ message: 'Desconto inválido. Deve ser entre 0 e 100.' });
    }

    const batch = await updateBatchDiscountById(id, discountPercent);
    res.json({ message: 'Desconto atualizado com sucesso', batch });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Erro ao atualizar desconto' });
  }
}
