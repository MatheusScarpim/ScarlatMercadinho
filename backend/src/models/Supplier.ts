import { Schema, model, Document } from 'mongoose';

interface Address {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface SupplierDocument extends Document {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  address?: Address;
  notes?: string;
  active: boolean;
}

const supplierSchema = new Schema(
  {
    name: { type: String, required: true },
    cnpj: { type: String },
    phone: { type: String },
    email: { type: String },
    contactName: { type: String },
    address: {
      street: String,
      number: String,
      neighborhood: String,
      city: String,
      state: String,
      zipCode: String
    },
    notes: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const SupplierModel = model<SupplierDocument>('Supplier', supplierSchema);
