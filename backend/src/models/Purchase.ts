import { Schema, model, Document, Types } from 'mongoose';

interface PurchaseItem {
  product: Types.ObjectId;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseDocument extends Document {
  supplier: Types.ObjectId;
  invoiceNumber?: string;
  issueDate: Date;
  arrivalDate: Date;
  items: PurchaseItem[];
  totalAmount: number;
  notes?: string;
  createdBy: Types.ObjectId;
  location?: string;
}

const purchaseItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true }
  },
  { _id: false }
);

const purchaseSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    invoiceNumber: { type: String },
    issueDate: { type: Date, required: true },
    arrivalDate: { type: Date, required: true },
    items: { type: [purchaseItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, default: 'default' }
  },
  { timestamps: true }
);

export const PurchaseModel = model<PurchaseDocument>('Purchase', purchaseSchema);
