import { Schema, model, Document, Types } from 'mongoose';

export interface StockMovementDocument extends Document {
  product: Types.ObjectId;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  relatedPurchase?: Types.ObjectId;
  relatedSale?: Types.ObjectId;
  user?: Types.ObjectId;
}

const stockMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['ENTRY', 'EXIT', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, required: true },
    relatedPurchase: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    relatedSale: { type: Schema.Types.ObjectId, ref: 'Sale' },
    user: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const StockMovementModel = model<StockMovementDocument>('StockMovement', stockMovementSchema);
