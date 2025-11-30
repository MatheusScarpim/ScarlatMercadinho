import { Request, Response } from 'express';
import { fetchCosmosProduct } from '../services/cosmosService';
import { GtinLookupModel } from '../models/GtinLookup';

export async function getAllGtinLookups(req: Request, res: Response) {
  try {
    const lookups = await GtinLookupModel.find().lean();
    return res.json(lookups);
  } catch (err: any) {
    console.log('[GTIN-LOOKUPS] error', err?.message ?? err);
    return res.status(500).json({ message: 'Erro ao buscar lookups' });
  }
}

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
