import { Schema, model, Document } from 'mongoose';

export interface UnitDocument extends Document {
  name: string;
  abbreviation: string;
  description?: string;
  active: boolean;
}

const unitSchema = new Schema(
  {
    name: { type: String, required: true },
    abbreviation: { type: String, required: true, uppercase: true },
    description: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const UnitModel = model<UnitDocument>('Unit', unitSchema);
