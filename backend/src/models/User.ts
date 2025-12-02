import { Schema, model, Document } from 'mongoose';
import { ALL_PERMISSIONS, ScreenPermission } from '../config/permissions';

const userSchema = new Schema(
  {
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
  passwordMustChange: { type: Boolean, default: false },
  permissions: { type: [String], enum: ALL_PERMISSIONS, default: () => [...ALL_PERMISSIONS] },
  active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'STAFF';
  passwordMustChange: boolean;
  permissions: ScreenPermission[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UserModel = model<UserDocument>('User', userSchema);
