import { Schema, model, Document } from 'mongoose';

export interface SettingDocument extends Document {
  key: string;
  value: any;
}

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const SettingModel = model<SettingDocument>('Setting', settingSchema);
