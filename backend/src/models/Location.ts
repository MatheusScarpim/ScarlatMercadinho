import { Schema, model, Document } from 'mongoose';

export interface LocationDocument extends Document {
  name: string;
  code: string;
  description?: string;
  active: boolean;
  reloadRequested: boolean;
  mpAccessToken?: string;
  mpPointDeviceId?: string;
  screensaverBgColor?: string;
  screensaverBgImageUrl?: string;
  tapMessageColor?: string;
  tapMessageBgColor?: string;
}

const locationSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    reloadRequested: { type: Boolean, default: false },
    mpAccessToken: { type: String, select: false },
    mpPointDeviceId: { type: String, select: false },
    screensaverBgColor: { type: String },
    screensaverBgImageUrl: { type: String },
    tapMessageColor: { type: String },
    tapMessageBgColor: { type: String },
  },
  { timestamps: true }
);

export const LocationModel = model<LocationDocument>('Location', locationSchema);
