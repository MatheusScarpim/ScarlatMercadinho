import { Schema, model, Document, Types } from 'mongoose';

export interface BatchDocument extends Document {
  product: Types.ObjectId;
  location: string;
  batchCode?: string | null;
  quantity: number;
  expiryDate: Date;
  purchasePrice: number; // Custo de compra
  originalSalePrice: number; // Preço de venda original (sem desconto)
  currentPrice: number; // Preço atual com desconto aplicado
  discountPercent: number;
  manualDiscount: boolean; // Flag para indicar desconto manual
  purchaseId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    location: { type: String, required: true, default: 'default' },
    batchCode: { type: String, default: null },
    quantity: { type: Number, required: true, default: 0 },
    expiryDate: { type: Date, required: true, index: true },
    purchasePrice: { type: Number, required: true }, // Custo de compra
    originalSalePrice: { type: Number }, // Preço de venda original (opcional para retrocompatibilidade)
    currentPrice: { type: Number, required: true }, // Preço atual com desconto
    discountPercent: { type: Number, default: 0 },
    manualDiscount: { type: Boolean, default: false }, // Flag para desconto manual
    purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' }
  },
  { timestamps: true }
);

// Índice composto para buscar lotes por produto e localização
batchSchema.index({ product: 1, location: 1 });
batchSchema.index({ product: 1, location: 1, batchCode: 1 });

// Índice para buscar lotes próximos do vencimento
batchSchema.index({ expiryDate: 1 });

// Método para calcular desconto baseado em dias até vencimento
batchSchema.methods.calculateDynamicDiscount = function() {
  const today = new Date();
  const daysUntilExpiry = Math.ceil((this.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Regras de desconto progressivo
  let discount = 0;
  if (daysUntilExpiry <= 0) {
    // Vencido - 100% de desconto (não vender)
    discount = 100;
  } else if (daysUntilExpiry <= 3) {
    // 3 dias ou menos - 50% de desconto
    discount = 50;
  } else if (daysUntilExpiry <= 7) {
    // 1 semana - 30% de desconto
    discount = 30;
  } else if (daysUntilExpiry <= 15) {
    // 2 semanas - 20% de desconto
    discount = 20;
  } else if (daysUntilExpiry <= 30) {
    // 1 mês - 10% de desconto
    discount = 10;
  }

  return discount;
};

// Hook para atualizar preço antes de salvar
batchSchema.pre('save', async function(next) {
  // Se desconto foi ajustado manualmente, não recalcula automaticamente
  if (!this.manualDiscount) {
    const discount = this.calculateDynamicDiscount();
    this.discountPercent = discount;
  }

  // Se não tem originalSalePrice (lotes antigos), busca do produto
  if (!this.originalSalePrice) {
    const ProductModel = require('./Product').ProductModel;
    const product = await ProductModel.findById(this.product);
    if (product) {
      this.originalSalePrice = product.salePrice;
    }
  }

  // Atualiza o preço atual aplicando desconto sobre a MARGEM de lucro
  if (this.originalSalePrice) {
    const discount = this.discountPercent;
    if (discount > 0) {
      // Calcula a margem de lucro
      const margin = this.originalSalePrice - this.purchasePrice;
      // Aplica o desconto sobre a margem (não sobre o preço total)
      const reducedMargin = margin * (1 - discount / 100);
      // Preço final = custo + margem reduzida
      this.currentPrice = Number((this.purchasePrice + reducedMargin).toFixed(2));
    } else {
      this.currentPrice = this.originalSalePrice;
    }
  }

  next();
});

export const BatchModel = model<BatchDocument>('Batch', batchSchema);
