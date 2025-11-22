import { defineStore } from 'pinia';
import api from '../services/api';

interface CartItem {
  saleItemId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isWeighed: boolean;
}

export const useKioskStore = defineStore('kiosk', {
  state: () => ({
    saleId: '',
    cart: [] as CartItem[],
    message: '',
    selectedLocation: (localStorage.getItem('kioskLocation') as string) || ''
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
      const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'default';
      if (!this.saleId) {
        const { data } = await api.post('/sales', { origin: 'KIOSK', location });
        this.saleId = data._id;
      }
    },
    async addByBarcode(barcode: string) {
      try {
        const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'default';
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
          this.cart.push({
            saleItemId: data.item._id,
            productId: product._id,
            name: product.name,
            price: product.salePrice,
            quantity: 1,
            isWeighed: product.isWeighed
          });
        }
        this.message = '';
      } catch (err: any) {
        this.message = err?.response?.data?.message || 'Produto não encontrado';
      }
    },
    async addByProduct(product: any) {
      await this.ensureSale();
      const existing = this.cart.find((c) => c.productId === product._id);
      if (existing) {
        existing.quantity += 1;
        const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'default';
        const { data } = await api.post(`/sales/${this.saleId}/items`, { productId: product._id, quantity: 1, location });
        existing.saleItemId = data.item._id;
      } else {
        const location = this.selectedLocation || import.meta.env.VITE_KIOSK_LOCATION || 'default';
        const { data } = await api.post(`/sales/${this.saleId}/items`, { productId: product._id, quantity: 1, location });
        this.cart.push({
          saleItemId: data.item._id,
          productId: product._id,
          name: product.name,
          price: product.salePrice,
          quantity: 1,
          isWeighed: product.isWeighed
        });
      }
    },
    async changeQuantity(item: CartItem, quantity: number) {
      item.quantity = quantity;
      await api.put(`/sales/${this.saleId}/items/${item.saleItemId}`, { quantity });
    },
    async remove(item: CartItem) {
      this.cart = this.cart.filter((c) => c.saleItemId !== item.saleItemId);
      await api.delete(`/sales/${this.saleId}/items/${item.saleItemId}`);
    },
    resetCart() {
      this.saleId = '';
      this.cart = [];
      this.message = '';
    },
    async complete(paymentMethod: string, apartmentNote?: string) {
      if (!this.saleId) return;
      await api.post(`/sales/${this.saleId}/complete`, { paymentMethod, apartmentNote });
      this.resetCart();
    }
  }
});
