import { Schema, model, Document } from 'mongoose';

export interface GtinLookupDocument extends Document {
  ean: string;
  name: string | null;
  description: string | null;
  globalProductCategory: string | null;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  averagePrice: string | null;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const gtinLookupSchema = new Schema(
  {
    ean: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: null },
    description: { type: String, default: null },
    globalProductCategory: { type: String, default: null },
    categoryId: { type: String, default: null },
    categoryName: { type: String, default: null },
    imageUrl: { type: String, default: null },
    averagePrice: { type: String, default: null },
    sourceUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export const GtinLookupModel = model<GtinLookupDocument>('GtinLookup', gtinLookupSchema);
