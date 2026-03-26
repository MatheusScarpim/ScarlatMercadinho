import { Request, Response } from 'express';
import { LocationModel } from '../models/Location';

async function sendKioskCommand(ip: string, endpoint: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `http://${ip}/${endpoint}`;
    const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(5000) });
    if (res.ok) return { success: true };
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Recarrega o kiosk de um local específico
export async function reloadKiosk(req: Request, res: Response) {
  const location = await LocationModel.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Local não encontrado' });
  if (!location.kioskIp) return res.status(400).json({ message: 'Este local não possui IP de kiosk configurado' });

  const result = await sendKioskCommand(location.kioskIp, 'api/reload');
  if (result.success) {
    return res.json({ message: `Kiosk "${location.name}" recarregado com sucesso` });
  }
  return res.status(502).json({ message: `Falha ao recarregar kiosk "${location.name}"`, error: result.error });
}

// Recarrega todos os kiosks que possuem IP configurado
export async function reloadAllKiosks(_req: Request, res: Response) {
  const locations = await LocationModel.find({ active: true, kioskIp: { $exists: true, $ne: '' } });

  if (locations.length === 0) {
    return res.json({ message: 'Nenhum kiosk com IP configurado', results: [] });
  }

  const results = await Promise.all(
    locations.map(async (loc) => {
      const result = await sendKioskCommand(loc.kioskIp!, 'api/reload');
      return { location: loc.name, ip: loc.kioskIp, ...result };
    })
  );

  const successCount = results.filter((r) => r.success).length;
  res.json({
    message: `${successCount}/${results.length} kiosks recarregados`,
    results
  });
}

// Limpa cache e recarrega o kiosk
export async function clearCacheAndReload(req: Request, res: Response) {
  const location = await LocationModel.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Local não encontrado' });
  if (!location.kioskIp) return res.status(400).json({ message: 'Este local não possui IP de kiosk configurado' });

  await sendKioskCommand(location.kioskIp, 'api/clearCache');
  const result = await sendKioskCommand(location.kioskIp, 'api/reload');

  if (result.success) {
    return res.json({ message: `Cache limpo e kiosk "${location.name}" recarregado` });
  }
  return res.status(502).json({ message: `Falha ao recarregar kiosk "${location.name}"`, error: result.error });
}
