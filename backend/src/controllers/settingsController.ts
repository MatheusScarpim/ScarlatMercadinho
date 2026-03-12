import { Request, Response } from 'express';
import { getMarginPercent, saveMarginPercent, getWhiteLabelSettings, saveWhiteLabelSettings } from '../services/settingsService';

export async function getMargin(_req: Request, res: Response) {
  const marginPercent = await getMarginPercent();
  res.json({ marginPercent });
}

export async function updateMargin(req: Request, res: Response) {
  const { marginPercent } = req.body;
  if (typeof marginPercent !== 'number' || Number.isNaN(marginPercent)) {
    return res.status(400).json({ message: 'marginPercent deve ser numérico' });
  }
  const saved = await saveMarginPercent(marginPercent);
  res.json({ marginPercent: saved });
}

export async function getWhitelabel(_req: Request, res: Response) {
  const config = await getWhiteLabelSettings();
  res.json(config);
}

export async function updateWhitelabel(req: Request, res: Response) {
  const saved = await saveWhiteLabelSettings(req.body);
  res.json(saved);
}

export async function uploadBrandImage(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
}
