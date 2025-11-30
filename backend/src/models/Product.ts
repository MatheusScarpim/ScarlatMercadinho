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
    isWeighed: { type: Boolean, default: false }
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
