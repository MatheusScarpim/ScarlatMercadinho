import { Schema, model, Document } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'STAFF';
  active: boolean;
}

export const UserModel = model<UserDocument>('User', userSchema);
