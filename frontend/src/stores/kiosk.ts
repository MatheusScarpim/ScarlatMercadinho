import { defineStore } from 'pinia';
import api from '../services/api';

interface CartItem {
  saleItemId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isWeighed: boolean;
  imageUrl?: string | null;
  originalPrice?: number;
  discountPercent?: number;
  expiryDate?: string | null;
}

export const useKioskStore = defineStore('kiosk', {
  state: () => ({
    saleId: '',
    cart: [] as CartItem[],
    message: '',
    selectedLocation: (localStorage.getItem('kioskLocation') as string) || import.meta.env.VITE_KIOSK_LOCATION || 'central'
  }),
  getters: {
    subtotal: (state) => state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    totalItems: (state) => state.cart.reduce((sum, i) => sum + i.quantity, 0)
  },
  actions: {
    setLocation(location: string) {
      this.selectedLocation = location;
      localStorage.setItem('kioskLocation', location);
      this.resetCart();
    },
    async ensureSale() {
      const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'central';
      if (!this.saleId) {
        const { data } = await api.post('/sales', { origin: 'KIOSK', location });
        this.saleId = data._id;
      }
    },
    async addByBarcode(barcode: string) {
      try {
        const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'central';
        const { data: product } = await api.get(`/products/barcode/${barcode}`, { params: { location } });
        await this.ensureSale();
        const existing = this.cart.find((c) => c.productId === product._id);
        if (existing) {
          existing.quantity += 1;
          const { data } = await api.post(`/sales/${this.saleId}/items`, {
            productId: product._id,
            quantity: 1,
            location
          });
          existing.saleItemId = data.item._id;
        } else {
          const { data } = await api.post(`/sales/${this.saleId}/items`, {
            productId: product._id,
            quantity: 1,
            location
          });

          // Usa o preço original do batch (se houver desconto)
          const originalPrice = product.hasBatch && product.batchDiscount > 0
            ? product.batchOriginalPrice
            : undefined;

          // Calcula a porcentagem real de desconto baseado nos preços (não na margem)
          const realDiscountPercent = originalPrice && product.salePrice < originalPrice
            ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
            : 0;

          this.cart.push({
            saleItemId: data.item._id,
            productId: product._id,
            name: product.name,
            price: product.salePrice,
            quantity: 1,
            isWeighed: product.isWeighed,
            imageUrl: product.imageUrl || null,
            originalPrice,
            discountPercent: realDiscountPercent,
            expiryDate: product.batchExpiryDate || null
          });
        }
        this.message = '';
      } catch (err: any) {
        this.message = err?.response?.data?.message || 'Produto nao encontrado';
      }
    },
    async addByProduct(product: any) {
      await this.ensureSale();
      const existing = this.cart.find((c) => c.productId === product._id);
      const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'central';
      if (existing) {
        existing.quantity += 1;
        const { data } = await api.post(`/sales/${this.saleId}/items`, { productId: product._id, quantity: 1, location });
        existing.saleItemId = data.item._id;
      } else {
        const { data } = await api.post(`/sales/${this.saleId}/items`, { productId: product._id, quantity: 1, location });

        // Usa o preço original do batch (se houver desconto)
        const originalPrice = product.hasBatch && product.batchDiscount > 0
          ? product.batchOriginalPrice
          : undefined;

        // Calcula a porcentagem real de desconto baseado nos preços (não na margem)
        const realDiscountPercent = originalPrice && product.salePrice < originalPrice
          ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
          : 0;

        this.cart.push({
          saleItemId: data.item._id,
          productId: product._id,
          name: product.name,
          price: product.salePrice,
          quantity: 1,
          isWeighed: product.isWeighed,
          imageUrl: product.imageUrl || null,
          originalPrice,
          discountPercent: realDiscountPercent,
          expiryDate: product.batchExpiryDate || null
        });
      }
    },
    async changeQuantity(item: CartItem, quantity: number) {
      const prevQuantity = item.quantity;
      try {
        item.quantity = quantity;
        await api.put(`/sales/${this.saleId}/items/${item.saleItemId}`, { quantity });
      } catch (err: any) {
        item.quantity = prevQuantity;
        this.message = err?.response?.data?.message || 'Erro ao atualizar quantidade';
      }
    },
    async remove(item: CartItem) {
      const prevCart = [...this.cart];
      try {
        this.cart = this.cart.filter((c) => c.saleItemId !== item.saleItemId);
        await api.delete(`/sales/${this.saleId}/items/${item.saleItemId}`);
      } catch (err: any) {
        this.cart = prevCart;
        this.message = err?.response?.data?.message || 'Erro ao remover item';
      }
    },
    resetCart() {
      this.saleId = '';
      this.cart = [];
      this.message = '';
    },
    async startPayment(paymentMethod: string, apartmentNote?: string, cpf?: string) {
      if (!this.saleId) return { completed: false };

      if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD' || paymentMethod === 'PIX') {
        const body: Record<string, string> = { method: paymentMethod };
        if (cpf) body.cpf = cpf;
        const { data } = await api.post(`/payments/sales/${this.saleId}`, body);

        const provider = data?.providerResponse || {};
        if (paymentMethod === 'PIX') {
          return { completed: false, provider };
        }

        // Para cartão, o createPointPaymentIntent retorna state: "OPEN"
        // NUNCA deve completar a venda aqui - sempre deve ir pro polling
        // O state "FINISHED" do Point API NÃO significa aprovado, apenas que processou
        return { completed: false, provider };
      }

      await api.post(`/sales/${this.saleId}/complete`, { paymentMethod, apartmentNote });
      this.resetCart();
      return { completed: true };
    },
    async finalizeSale(paymentMethod: string, apartmentNote?: string) {
      if (!this.saleId) return;
      try {
        await api.post(`/sales/${this.saleId}/complete`, { paymentMethod, apartmentNote });
        this.resetCart();
      } catch (err: any) {
        this.message = err?.response?.data?.message || 'Erro ao finalizar venda';
        throw err;
      }
    },
    async setCustomer(
      customer: { cpf?: string; phone?: string; email?: string },
      options?: { persist?: boolean }
    ) {
      await this.ensureSale();
      const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'central';
      await api.put(`/sales/${this.saleId}/customer`, customer);
      const shouldPersist = options?.persist ?? true;
      if (shouldPersist && customer.cpf) {
        await api.post('/customers/upsert', {
          ...customer,
          origin: 'KIOSK',
          location
        });
      }
    }
  }
});
