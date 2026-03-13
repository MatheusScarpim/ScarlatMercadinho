import { Schema, model, Document } from 'mongoose';

export interface ChatMessageDocument extends Document {
  sessionId: string;
  sender: 'CUSTOMER' | 'AI' | 'ADMIN';
  message: string;
  adminId?: string;
  customerName?: string;
  location?: string;
  closed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    sender: { type: String, enum: ['CUSTOMER', 'AI', 'ADMIN'], required: true },
    message: { type: String, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String },
    location: { type: String },
    closed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessageModel = model<ChatMessageDocument>('ChatMessage', chatMessageSchema);
