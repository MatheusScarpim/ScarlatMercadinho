import { Request, Response } from 'express';
import * as customerService from '../services/customerService';

export async function upsertCustomer(req: Request, res: Response) {
  const customer = await customerService.upsertCustomer(req.body);
  res.status(201).json(customer);
}
