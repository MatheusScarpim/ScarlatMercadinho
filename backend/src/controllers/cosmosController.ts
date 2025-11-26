import { Request, Response } from 'express';
import { fetchCosmosProduct } from '../services/cosmosService';

export async function getCosmosProduct(req: Request, res: Response) {
  const { ean } = req.params;
  if (!ean) {
    return res.status(400).json({ message: 'EAN é obrigatório' });
  }

  const nameHint = (req.query.name as string | undefined)?.toString().trim() || undefined;

  // DEBUG opcional
  // eslint-disable-next-line no-console
  console.log('[COSMOS] inbound', { ean, query: req.query });

  try {
    const product = await fetchCosmosProduct(ean, nameHint);
    return res.json(product);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.log('[COSMOS] error', err?.message ?? err);
    return res.status(400).json({ message: err?.message || 'Erro ao consultar Cosmos' });
  }
}
