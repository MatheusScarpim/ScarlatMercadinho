import { Schema, model, Document } from 'mongoose';
import { NfceData } from '../services/nfceService';

export interface NfceDocument extends Document {
  chaveAcesso?: string | null;
  chaveAcessoNumerica?: string | null;
  data: NfceData;
  lastFetchedAt: Date;
}

const nfceSchema = new Schema<NfceDocument>(
  {
    chaveAcesso: { type: String, index: true, unique: true, sparse: true },
    chaveAcessoNumerica: { type: String, index: true, sparse: true },
    data: { type: Schema.Types.Mixed, required: true },
    lastFetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const NfceModel = model<NfceDocument>('Nfce', nfceSchema);
