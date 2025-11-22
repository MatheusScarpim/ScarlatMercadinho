import { Schema, model, Document } from 'mongoose';

export interface LocationDocument extends Document {
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

const locationSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const LocationModel = model<LocationDocument>('Location', locationSchema);
