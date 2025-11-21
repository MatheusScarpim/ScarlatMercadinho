import { Schema, model, Document, Types } from 'mongoose';

export interface SaleItemDocument extends Document {
  sale: Types.ObjectId;
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  isWeighed: boolean;
  weight?: number;
}

const saleItemSchema = new Schema(
  {
    sale: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    isWeighed: { type: Boolean, default: false },
    weight: { type: Number }
  },
  { timestamps: true }
);

export const SaleItemModel = model<SaleItemDocument>('SaleItem', saleItemSchema);
