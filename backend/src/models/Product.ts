import { Schema, model, Document, Types } from 'mongoose';

export interface ProductDocument extends Document {
  name: string;
  description?: string;
  barcode: string;
  sku?: string;
  category: Types.ObjectId;
  mainSupplier?: Types.ObjectId;
  imageUrl?: string | null;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  stockByLocation: { location: string; quantity: number }[];
  minimumStock: number;
  active: boolean;
  isWeighed: boolean;
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  cst?: string | null;
  csosn?: string | null;
  icmsRate?: number | null;
  pisRate?: number | null;
  cofinsRate?: number | null;
  unit?: string | null;
}

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    barcode: { type: String, required: true, unique: true, index: true },
    sku: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    mainSupplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    imageUrl: { type: String, default: null },
    costPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    stockQuantity: { type: Number, default: 0 },
    stockByLocation: [
      {
        location: { type: String, default: 'default' },
        quantity: { type: Number, default: 0 }
      }
    ],
    minimumStock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    isWeighed: { type: Boolean, default: false },
    ncm: { type: String, default: null },
    cest: { type: String, default: null },
    cfop: { type: String, default: null },
    cst: { type: String, default: null },
    csosn: { type: String, default: null },
    icmsRate: { type: Number, default: null },
    pisRate: { type: Number, default: null },
    cofinsRate: { type: Number, default: null },
    unit: { type: String, default: null }
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.salePrice < this.costPrice * 0.5) {
    console.warn(`Sale price for ${this.name} seems too low compared to cost price.`);
  }
  next();
});

export const ProductModel = model<ProductDocument>('Product', productSchema);
