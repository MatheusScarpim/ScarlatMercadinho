import { Schema, model, Document } from 'mongoose';

export interface CustomerDocument extends Document {
  cpf: string;
  phone?: string;
  email?: string;
  origin?: 'KIOSK' | 'ADMIN_PANEL';
  location?: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema(
  {
    cpf: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    email: { type: String },
    origin: { type: String, enum: ['KIOSK', 'ADMIN_PANEL'], default: 'KIOSK' },
    location: { type: String },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const CustomerModel = model<CustomerDocument>('Customer', customerSchema);
