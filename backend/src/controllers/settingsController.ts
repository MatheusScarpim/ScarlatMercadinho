import { Request, Response } from 'express';
import { getMarginPercent, saveMarginPercent } from '../services/settingsService';

export async function getMargin(_req: Request, res: Response) {
  const marginPercent = await getMarginPercent();
  res.json({ marginPercent });
}

export async function updateMargin(req: Request, res: Response) {
  const { marginPercent } = req.body;
  if (typeof marginPercent !== 'number' || Number.isNaN(marginPercent)) {
    return res.status(400).json({ message: 'marginPercent deve ser num��rico' });
  }
  const saved = await saveMarginPercent(marginPercent);
  res.json({ marginPercent: saved });
}
