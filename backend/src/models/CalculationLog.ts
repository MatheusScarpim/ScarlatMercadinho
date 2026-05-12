import { Schema, model, Document } from 'mongoose';

export interface CalculationLogDocument extends Document {
  a: number;
  b: number;
  operation: 'sum' | 'subtract' | 'multiply' | 'divide';
  result: number;
}

const calculationLogSchema = new Schema(
  {
    a: { type: Number, required: true },
    b: { type: Number, required: true },
    operation: {
      type: String,
      enum: ['sum', 'subtract', 'multiply', 'divide'],
      required: true,
    },
    result: { type: Number, required: true },
  },
  { timestamps: true }
);

export const CalculationLogModel = model<CalculationLogDocument>('CalculationLog', calculationLogSchema);
