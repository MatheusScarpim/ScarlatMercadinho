import { CustomerModel } from '../models/Customer';

export async function upsertCustomer(data: {
  cpf: string;
  phone?: string;
  email?: string;
  origin?: 'KIOSK' | 'ADMIN_PANEL';
  location?: string;
}) {
  const payload = {
    cpf: data.cpf.trim(),
    phone: data.phone?.trim(),
    email: data.email?.trim(),
    origin: data.origin || 'KIOSK',
    location: data.location,
    lastSeenAt: new Date()
  };

  const customer = await CustomerModel.findOneAndUpdate(
    { cpf: payload.cpf },
    { $set: payload },
    { new: true, upsert: true }
  );
  return customer;
}
