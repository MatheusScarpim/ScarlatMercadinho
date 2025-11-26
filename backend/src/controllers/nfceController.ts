import { Request, Response } from 'express';
import { scrapeNfce } from '../services/nfceService';

export async function getNfce(req: Request, res: Response) {
  const { url } = req.query;
  if (typeof url !== 'string') {
    return res.status(400).json({ message: 'Parâmetro "url" é obrigatório' });
  }

  const data = await scrapeNfce(url);
  res
    .set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    .set('Pragma', 'no-cache')
    .set('Expires', '0')
    .set('Surrogate-Control', 'no-store')
    .set('ETag', `${Date.now()}`) // força ETag único para evitar 304
    .status(200)
    .json(data);
}
