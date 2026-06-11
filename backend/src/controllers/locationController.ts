import { Request, Response } from 'express';
import { LocationModel } from '../models/Location';
import { listPointDevices, configurePointDevice } from '../services/paymentGatewayService';

export async function createLocation(req: Request, res: Response) {
  const location = await LocationModel.create(req.body);
  res.status(201).json(location);
}

export async function listLocations(_req: Request, res: Response) {
  const locations = await LocationModel.find();
  res.json(locations);
}

export async function getLocation(req: Request, res: Response) {
  const location = await LocationModel.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Not found' });
  res.json(location);
}

// Versão para o admin: inclui as credenciais da maquininha (rota autenticada).
export async function getLocationForEdit(req: Request, res: Response) {
  const location = await LocationModel.findById(req.params.id).select(
    '+mpAccessToken +mpPointDeviceId'
  );
  if (!location) return res.status(404).json({ message: 'Not found' });
  res.json(location);
}

export async function updateLocation(req: Request, res: Response) {
  const update = { ...req.body };
  if (update.mpAccessToken === '') delete update.mpAccessToken;
  if (update.mpPointDeviceId === '') delete update.mpPointDeviceId;
  const location = await LocationModel.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!location) return res.status(404).json({ message: 'Not found' });
  res.json(location);
}

export async function deleteLocation(req: Request, res: Response) {
  const location = await LocationModel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!location) return res.status(404).json({ message: 'Not found' });
  res.json(location);
}

// Busca as maquininhas (Point devices) vinculadas a um Access Token
export async function listLocationDevices(req: Request, res: Response) {
  const accessToken = (req.body?.accessToken || '').trim();
  if (!accessToken) {
    return res.status(400).json({ message: 'Informe o Access Token para buscar a maquininha.' });
  }
  const devices = await listPointDevices(accessToken);
  res.json({ devices });
}

// Ativa o modo PDV na maquininha (necessário para o sistema enviar cobranças)
export async function configureLocationDevice(req: Request, res: Response) {
  const accessToken = (req.body?.accessToken || '').trim();
  const deviceId = (req.body?.deviceId || '').trim();
  if (!accessToken) {
    return res.status(400).json({ message: 'Informe o Access Token.' });
  }
  if (!deviceId) {
    return res.status(400).json({ message: 'Informe o Device ID da maquininha.' });
  }
  const result = await configurePointDevice(accessToken, deviceId);
  if (!result.success) {
    return res.status(400).json({ message: result.error || 'Não foi possível ativar o modo PDV.' });
  }
  res.json({ success: true, mode: result.mode || 'PDV' });
}

export async function uploadScreensaverImage(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
}
