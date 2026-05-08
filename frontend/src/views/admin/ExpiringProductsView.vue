<template>
  <div class="view-container">
    <transition name="toast">
      <div v-if="toast.visible" class="toast" :class="`toast-${toast.type}`" role="status">
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'error'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="toast-body">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message" v-if="toast.message">{{ toast.message }}</div>
          <div class="toast-dates" v-if="toast.oldDate && toast.newDate">
            <span class="toast-old">{{ toast.oldDate }}</span>
            <span class="toast-arrow">→</span>
            <span class="toast-new">{{ toast.newDate }}</span>
          </div>
        </div>
        <button class="toast-close" @click="hideToast" aria-label="Fechar">✕</button>
      </div>
    </transition>

    <div class="header">
      <h3>Produtos Próximos do Vencimento</h3>
      <div class="header-actions">
        <button class="btn btn-danger" @click="writeOffAllExpired" :disabled="writingOff">
          {{ writingOff ? 'Removendo...' : 'Dar baixa em todos vencidos' }}
        </button>
        <button class="btn btn-primary" @click="updatePrices" :disabled="updating">
          {{ updating ? 'Atualizando...' : 'Atualizar Preços' }}
        </button>
      </div>
    </div>

    <div class="filters glass">
      <select v-model="daysFilter" @change="load">
        <option value="7">Próximos 7 dias</option>
        <option value="15">Próximos 15 dias</option>
        <option value="30">Próximos 30 dias</option>
        <option value="60">Próximos 60 dias</option>
      </select>
    </div>

    <div class="batches-grid">
      <div class="batch-card glass" v-for="batch in batches" :key="batch._id" :class="getExpiryClass(batch)">
        <div class="batch-header">
          <div class="product-info">
            <h4>{{ batch.product?.name }}</h4>
            <p class="barcode">{{ batch.product?.barcode }}</p>
          </div>
          <div class="discount-badge" v-if="batch.discountPercent > 0" :class="{ 'manual': batch.manualDiscount }">
            -{{ batch.discountPercent }}%
            <span class="manual-indicator" v-if="batch.manualDiscount" title="Desconto manual">✓</span>
          </div>
        </div>

        <div class="batch-details">
          <div class="detail-row">
            <span class="label">Local:</span>
            <span class="value">{{ batch.location }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Quantidade:</span>
            <span class="value">{{ batch.quantity }} un</span>
          </div>
          <div class="detail-row">
            <span class="label">Vencimento:</span>
            <span class="value" :class="{ 'danger': daysUntilExpiry(batch) <= 3 }">
              {{ formatDate(batch.expiryDate) }} ({{ daysUntilExpiry(batch) }} dias)
            </span>
          </div>
        </div>

        <div class="batch-pricing">
          <div class="price-item">
            <span class="price-label">Preço Original</span>
            <span class="price-value original">R$ {{ batch.originalSalePrice?.toFixed(2) }}</span>
          </div>
          <div class="price-item">
            <span class="price-label">Preço Atual</span>
            <span class="price-value current">R$ {{ batch.currentPrice?.toFixed(2) }}</span>
          </div>
        </div>

        <div class="urgency-indicator" :class="getUrgencyClass(batch)">
          {{ getUrgencyText(batch) }}
        </div>

        <div class="batch-actions">
          <div class="discount-control">
            <label>Ajustar Desconto</label>
            <div class="control-group">
              <input
                type="number"
                v-model.number="batch.customDiscount"
                min="0"
                max="100"
                placeholder="%"
                class="discount-input"
              />
              <button
                class="btn btn-sm btn-primary"
                @click="applyCustomDiscount(batch)"
                :disabled="!batch.customDiscount || batch.customDiscount < 0 || batch.customDiscount > 100"
              >
                Aplicar
              </button>
            </div>
          </div>
          <div class="discount-control">
            <label>Editar Vencimento</label>
            <div class="control-group">
              <input
                type="date"
                v-model="batch.newExpiryDate"
                class="discount-input"
              />
              <button
                class="btn btn-sm btn-primary"
                @click="applyExpiryDate(batch)"
                :disabled="!batch.newExpiryDate || batch.newExpiryDate === toInputDate(batch.expiryDate)"
              >
                Salvar
              </button>
            </div>
          </div>
          <button
            class="btn btn-sm btn-ghost"
            @click="removeDiscount(batch)"
            v-if="batch.discountPercent > 0"
          >
            Remover Promoção
          </button>
        </div>
      </div>
    </div>

    <div v-if="!batches.length" class="empty-state">
      <div class="empty-icon">✅</div>
      <h4>Nenhum produto próximo do vencimento</h4>
      <p class="muted">Todos os produtos estão com prazo de validade adequado</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../../services/api';

const batches = ref<any[]>([]);
const daysFilter = ref('30');
const updating = ref(false);
const writingOff = ref(false);

interface ToastState {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  oldDate?: string;
  newDate?: string;
}

const toast = ref<ToastState>({ visible: false, type: 'success', title: '' });
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(payload: Omit<ToastState, 'visible'>, durationMs = 4000) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { ...payload, visible: true };
  toastTimer = setTimeout(() => hideToast(), durationMs);
}

function hideToast() {
  toast.value = { ...toast.value, visible: false };
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

async function load() {
  try {
    const { data } = await api.get('/batches/expiring', {
      params: { days: daysFilter.value }
    });
    batches.value = (data as any[]).map((b) => ({
      ...b,
      newExpiryDate: toInputDate(b.expiryDate)
    }));
  } catch (error) {
    console.error('Failed to load expiring batches:', error);
  }
}

function toInputDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function applyExpiryDate(batch: any) {
  try {
    if (!batch.newExpiryDate) return;
    const oldDateFormatted = formatDate(batch.expiryDate);
    const productName = batch.product?.name || 'Produto';
    // Envia com hora local (meio-dia) para evitar deslocamento de fuso
    // Ex: "2026-05-12" -> "2026-05-12T12:00:00" interpretado em horário local
    const expiryDate = `${batch.newExpiryDate}T12:00:00`;
    await api.patch(`/batches/${batch._id}/expiry`, { expiryDate });
    const newDateFormatted = formatDate(expiryDate);
    showToast({
      type: 'success',
      title: `Vencimento atualizado: ${productName}`,
      oldDate: oldDateFormatted,
      newDate: newDateFormatted
    });
    await load();
  } catch (error: any) {
    console.error('Failed to update expiry date:', error);
    showToast({
      type: 'error',
      title: 'Erro ao atualizar vencimento',
      message: error?.response?.data?.message || 'Tente novamente em alguns instantes.'
    }, 5000);
  }
}

async function writeOffAllExpired() {
  if (!confirm('Tem certeza que deseja dar baixa em TODOS os lotes vencidos? Isso removerá os produtos vencidos do estoque.')) {
    return;
  }
  try {
    writingOff.value = true;
    const { data } = await api.post('/batches/write-off-expired');
    alert(`${data.count} lote(s) vencido(s) removido(s) do estoque.`);
    await load();
  } catch (error: any) {
    console.error('Failed to write off expired batches:', error);
    alert('Erro ao dar baixa nos lotes vencidos');
  } finally {
    writingOff.value = false;
  }
}

async function updatePrices() {
  try {
    updating.value = true;
    await api.post('/batches/update-prices');
    await load();
  } catch (error) {
    console.error('Failed to update prices:', error);
  } finally {
    updating.value = false;
  }
}

async function applyCustomDiscount(batch: any) {
  try {
    const discount = batch.customDiscount || 0;
    await api.patch(`/batches/${batch._id}/discount`, { discountPercent: discount });
    batch.customDiscount = null;
    alert(`Desconto de ${discount}% aplicado com sucesso!`);
    await load();
  } catch (error) {
    console.error('Failed to apply custom discount:', error);
    alert('Erro ao aplicar desconto personalizado');
  }
}

async function removeDiscount(batch: any) {
  try {
    if (!confirm('Deseja remover a promoção? O desconto voltará a ser calculado automaticamente.')) {
      return;
    }
    await api.patch(`/batches/${batch._id}/discount`, { discountPercent: 0 });
    alert('Promoção removida! O desconto agora é automático.');
    await load();
  } catch (error) {
    console.error('Failed to remove discount:', error);
    alert('Erro ao remover desconto');
  }
}

function daysUntilExpiry(batch: any): number {
  const today = new Date();
  const expiry = new Date(batch.expiryDate);
  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getExpiryClass(batch: any): string {
  const days = daysUntilExpiry(batch);
  if (days <= 0) return 'expired';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'urgent';
  if (days <= 15) return 'warning';
  return 'normal';
}

function getUrgencyClass(batch: any): string {
  const days = daysUntilExpiry(batch);
  if (days <= 0) return 'expired';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'urgent';
  if (days <= 15) return 'warning';
  return 'normal';
}

function getUrgencyText(batch: any): string {
  const days = daysUntilExpiry(batch);
  if (days <= 0) return '⚠️ VENCIDO - NÃO VENDER';
  if (days <= 3) return '🔴 CRÍTICO - Vence em 3 dias!';
  if (days <= 7) return '🟠 URGENTE - Vence esta semana';
  if (days <= 15) return '🟡 ATENÇÃO - Vence em 2 semanas';
  return '🟢 Prazo normal';
}

onMounted(() => {
  load();
});
</script>

<style scoped>
.view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-1px);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.filters {
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius);
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.batches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 12px;
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  align-content: start;
}

.batches-grid::-webkit-scrollbar {
  width: 8px;
}

.batches-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.batches-grid::-webkit-scrollbar-thumb {
  background: rgba(91, 231, 196, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.batches-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 231, 196, 0.5);
}

.batch-card {
  padding: 12px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s ease;
  border-left: 3px solid var(--primary);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.batch-card.critical {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.batch-card.urgent {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.batch-card.warning {
  border-left-color: #eab308;
  background: rgba(234, 179, 8, 0.05);
}

.batch-card.expired {
  border-left-color: #7f1d1d;
  background: rgba(127, 29, 29, 0.1);
  opacity: 0.7;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.product-info {
  flex: 1;
}

.product-info h4 {
  margin: 0 0 3px 0;
  font-size: 14px;
  font-weight: 600;
}

.barcode {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.discount-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border-radius: 5px;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.discount-badge.manual {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.manual-indicator {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.3);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.batch-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 5px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.label {
  color: var(--muted);
  font-weight: 600;
}

.value {
  font-weight: 600;
}

.value.danger {
  color: #ef4444;
}

.batch-pricing {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 5px;
}

.price-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  font-weight: 600;
}

.price-value {
  font-size: 14px;
  font-weight: 700;
}

.price-value.original {
  text-decoration: line-through;
  color: var(--muted);
}

.price-value.current {
  color: var(--primary);
}

.urgency-indicator {
  padding: 8px;
  border-radius: 5px;
  text-align: center;
  font-weight: 700;
  font-size: 12px;
}

.urgency-indicator.critical {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.urgency-indicator.urgent {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.urgency-indicator.warning {
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(234, 179, 8, 0.3);
  color: #eab308;
}

.urgency-indicator.normal {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.urgency-indicator.expired {
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(127, 29, 29, 0.4);
  color: #dc2626;
}

.batch-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.discount-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.discount-control label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
}

.control-group {
  display: flex;
  gap: 5px;
  align-items: center;
}

.discount-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.discount-input:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.05);
}

.discount-input::placeholder {
  color: var(--muted);
  opacity: 0.5;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 11px;
  border-radius: 5px;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  flex: 1;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 14px;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  max-width: 400px;
}

@media (max-width: 768px) {
  .batches-grid {
    grid-template-columns: 1fr;
  }

  .batch-pricing {
    grid-template-columns: 1fr;
  }
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 320px;
  max-width: 440px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(20, 25, 35, 0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  color: #fff;
}

.toast-success {
  border-left: 4px solid #22c55e;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(20, 25, 35, 0.96));
}

.toast-error {
  border-left: 4px solid #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(20, 25, 35, 0.96));
}

.toast-info {
  border-left: 4px solid #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(20, 25, 35, 0.96));
}

.toast-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
  padding-top: 2px;
}

.toast-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}

.toast-message {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
}

.toast-dates {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
}

.toast-old {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: line-through;
}

.toast-arrow {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
}

.toast-new {
  color: #22c55e;
  font-weight: 700;
  padding: 2px 8px;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 4px;
}

.toast-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.96);
}
</style>
