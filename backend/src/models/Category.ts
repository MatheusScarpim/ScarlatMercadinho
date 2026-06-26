import { Schema, model, Document, Types } from 'mongoose';

export interface CategoryDocument extends Document {
  name: string;
  description?: string;
  parent?: Types.ObjectId | null;
  active: boolean;
}

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const CategoryModel = model<CategoryDocument>('Category', categorySchema);
