import { Schema, model, Document } from 'mongoose';

export type PendingProductStatus = 'PENDING' | 'RESOLVED' | 'IGNORED';

export interface PendingProductDocument extends Document {
  barcode: string;
  lastSeenAt: Date;
  count: number;
  location?: string;
  status: PendingProductStatus;
  resolvedProduct?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pendingProductSchema = new Schema<PendingProductDocument>(
  {
    barcode: { type: String, required: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    count: { type: Number, default: 1 },
    location: { type: String, default: 'default' },
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'IGNORED'],
      default: 'PENDING',
      index: true,
    },
    resolvedProduct: { type: Schema.Types.ObjectId, ref: 'Product' },
  },
  { timestamps: true }
);

export const PendingProductModel = model<PendingProductDocument>('PendingProduct', pendingProductSchema);
