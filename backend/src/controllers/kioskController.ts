import { Request, Response } from 'express';
import { LocationModel } from '../models/Location';

// Marca um local específico para recarregar
export async function requestReload(req: Request, res: Response) {
  const location = await LocationModel.findByIdAndUpdate(
    req.params.id,
    { reloadRequested: true },
    { new: true }
  );
  if (!location) return res.status(404).json({ message: 'Local não encontrado' });
  console.log(`[KIOSK] Reload solicitado para "${location.name}" (${location.code})`);
  res.json({ message: `Reload solicitado para "${location.name}"` });
}

// Marca todos os locais ativos para recarregar
export async function requestReloadAll(_req: Request, res: Response) {
  const result = await LocationModel.updateMany(
    { active: true },
    { reloadRequested: true }
  );
  console.log(`[KIOSK] Reload solicitado para ${result.modifiedCount} locais`);
  res.json({ message: `Reload solicitado para ${result.modifiedCount} locais` });
}

// O kiosk chama essa rota para verificar se precisa recarregar (polling)
export async function checkReload(req: Request, res: Response) {
  const code = req.params.code?.toUpperCase();
  const location = await LocationModel.findOne({ code });
  if (!location) return res.json({ reload: false });

  if (location.reloadRequested) {
    // Limpa a flag para não recarregar em loop
    await LocationModel.updateOne({ _id: location._id }, { reloadRequested: false });
    console.log(`[KIOSK] Kiosk "${location.name}" vai recarregar agora`);
    return res.json({ reload: true });
  }

  res.json({ reload: false });
}
