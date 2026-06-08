import { Request, Response } from 'express';
import { LocationModel } from '../models/Location';

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

export async function uploadScreensaverImage(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
}
