<template>
  <div class="settings">
    <header class="header">
      <div>
        <p class="eyebrow">Configurações</p>
        <h3>Preferências da loja</h3>
      </div>
      <button class="btn" type="button" @click="loadAll" :disabled="loading">Recarregar</button>
    </header>

    <!-- Margem -->
    <form class="card" @submit.prevent="saveMarginValue">
      <h4 class="card-title">Margem padrão</h4>
      <p class="muted small">Usada para sugerir preço de venda nas entradas.</p>
      <div class="input-row">
        <input v-model.number="margin" type="number" min="0" step="0.1" required placeholder="Ex: 30" />
        <button class="btn primary" type="submit" :disabled="loading">Salvar</button>
      </div>
      <p v-if="marginError" class="error">{{ marginError }}</p>
      <p v-if="marginSaved" class="success">Margem salva.</p>
    </form>

    <!-- White-Label -->
    <form class="card" @submit.prevent="saveWl">
      <h4 class="card-title">Personalização da Marca</h4>
      <p class="muted small">Configure o nome, logo, cores e textos do sistema.</p>

      <div class="wl-section">
        <h5 class="section-title">Identidade</h5>
        <div class="wl-grid">
          <div class="field">
            <label>Nome da marca</label>
            <input v-model="wlForm.brandName" type="text" placeholder="Ex: Minha Loja" />
          </div>
          <div class="field">
            <label>Subtítulo</label>
            <input v-model="wlForm.brandSubtitle" type="text" placeholder="Ex: Market" />
          </div>
          <div class="field">
            <label>Título da página (aba do navegador)</label>
            <input v-model="wlForm.pageTitle" type="text" placeholder="Ex: Minha Loja Market" />
          </div>
        </div>

        <!-- Upload Logo -->
        <div class="upload-section">
          <div class="upload-box">
            <label class="upload-label">Logo</label>
            <div class="upload-area" @click="($refs.logoInput as HTMLInputElement).click()">
              <img v-if="wlForm.logoUrl" :src="resolveUrl(wlForm.logoUrl)" alt="Logo" class="upload-preview" />
              <div v-else class="upload-placeholder">
                <span class="upload-icon">+</span>
                <span class="upload-text">Clique para enviar</span>
              </div>
              <input
                ref="logoInput"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                class="file-hidden"
                @change="onUploadLogo"
              />
            </div>
            <button v-if="wlForm.logoUrl" type="button" class="btn-remove" @click="wlForm.logoUrl = ''">Remover</button>
          </div>

          <div class="upload-box">
            <label class="upload-label">Favicon</label>
            <div class="upload-area small" @click="($refs.faviconInput as HTMLInputElement).click()">
              <img v-if="wlForm.faviconUrl" :src="resolveUrl(wlForm.faviconUrl)" alt="Favicon" class="upload-preview small" />
              <div v-else class="upload-placeholder">
                <span class="upload-icon">+</span>
                <span class="upload-text">Enviar</span>
              </div>
              <input
                ref="faviconInput"
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/webp"
                class="file-hidden"
                @change="onUploadFavicon"
              />
            </div>
            <button v-if="wlForm.faviconUrl" type="button" class="btn-remove" @click="wlForm.faviconUrl = ''">Remover</button>
          </div>
        </div>
        <p v-if="uploadError" class="error">{{ uploadError }}</p>
      </div>

      <div class="wl-section">
        <h5 class="section-title">Cores do Tema</h5>
        <div class="wl-grid colors">
          <div class="field color-field">
            <label>Cor primária</label>
            <div class="color-input">
              <input v-model="wlForm.theme.primary" type="color" />
              <input v-model="wlForm.theme.primary" type="text" placeholder="#10b49d" />
            </div>
          </div>
          <div class="field color-field">
            <label>Cor primária forte</label>
            <div class="color-input">
              <input v-model="wlForm.theme.primaryStrong" type="color" />
              <input v-model="wlForm.theme.primaryStrong" type="text" placeholder="#0e9c87" />
            </div>
          </div>
          <div class="field color-field">
            <label>Fundo</label>
            <div class="color-input">
              <input v-model="wlForm.theme.bg" type="color" />
              <input v-model="wlForm.theme.bg" type="text" placeholder="#f6f8fb" />
            </div>
          </div>
          <div class="field color-field">
            <label>Superfície</label>
            <div class="color-input">
              <input v-model="wlForm.theme.surface" type="color" />
              <input v-model="wlForm.theme.surface" type="text" placeholder="#ffffff" />
            </div>
          </div>
          <div class="field color-field">
            <label>Texto</label>
            <div class="color-input">
              <input v-model="wlForm.theme.text" type="color" />
              <input v-model="wlForm.theme.text" type="text" placeholder="#1f2937" />
            </div>
          </div>
          <div class="field color-field">
            <label>Texto secundário</label>
            <div class="color-input">
              <input v-model="wlForm.theme.muted" type="color" />
              <input v-model="wlForm.theme.muted" type="text" placeholder="#5b6577" />
            </div>
          </div>
          <div class="field color-field">
            <label>Borda</label>
            <div class="color-input">
              <input v-model="wlForm.theme.border" type="color" />
              <input v-model="wlForm.theme.border" type="text" placeholder="#d9e2ec" />
            </div>
          </div>
          <div class="field">
            <label>Border radius</label>
            <input v-model="wlForm.theme.radius" type="text" placeholder="12px" />
          </div>
        </div>
      </div>

      <div class="wl-section">
        <h5 class="section-title">Textos</h5>
        <div class="wl-grid">
          <div class="field">
            <label>Eyebrow do login</label>
            <input v-model="wlForm.labels.loginEyebrow" type="text" placeholder="painel" />
          </div>
          <div class="field">
            <label>Eyebrow do admin</label>
            <input v-model="wlForm.labels.adminEyebrow" type="text" placeholder="admin" />
          </div>
          <div class="field">
            <label>Título do admin</label>
            <input v-model="wlForm.labels.adminTitle" type="text" placeholder="Backoffice" />
          </div>
          <div class="field">
            <label>Descrição de pagamento</label>
            <input v-model="wlForm.labels.paymentDescription" type="text" placeholder="Pagamento" />
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn" type="button" @click="resetWl" :disabled="loading">Restaurar Padrão</button>
        <button class="btn primary" type="submit" :disabled="loading">Salvar Personalização</button>
      </div>
      <p v-if="wlError" class="error">{{ wlError }}</p>
      <p v-if="wlSaved" class="success">Personalização salva.</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchMargin, saveMargin, fetchWhitelabel, saveWhitelabel, uploadBrandImage } from '../../services/settings';
import { defaults, updateConfig } from '../../config/whitelabel';
import type { WhiteLabelConfig } from '../../config/whitelabel';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const margin = ref(0);
const loading = ref(false);
const marginError = ref('');
const marginSaved = ref(false);

const wlError = ref('');
const wlSaved = ref(false);
const uploadError = ref('');

const wlForm: WhiteLabelConfig = reactive({
  ...defaults,
  theme: { ...defaults.theme },
  labels: { ...defaults.labels },
});

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${apiBase}${url}`;
}

function copyToForm(cfg: WhiteLabelConfig) {
  wlForm.brandName = cfg.brandName;
  wlForm.brandSubtitle = cfg.brandSubtitle;
  wlForm.pageTitle = cfg.pageTitle;
  wlForm.logoUrl = cfg.logoUrl;
  wlForm.faviconUrl = cfg.faviconUrl;
  Object.assign(wlForm.theme, cfg.theme);
  Object.assign(wlForm.labels, cfg.labels);
}

async function handleUpload(event: Event, target: 'logoUrl' | 'faviconUrl') {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;

  uploadError.value = '';
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = 'Arquivo muito grande. Máximo: 2MB';
    input.value = '';
    return;
  }

  try {
    const url = await uploadBrandImage(file);
    wlForm[target] = url;
  } catch (err: any) {
    uploadError.value = err?.response?.data?.message || 'Erro ao enviar arquivo';
  }
  input.value = '';
}

function onUploadLogo(e: Event) {
  handleUpload(e, 'logoUrl');
}

function onUploadFavicon(e: Event) {
  handleUpload(e, 'faviconUrl');
}

async function loadAll() {
  loading.value = true;
  marginError.value = '';
  marginSaved.value = false;
  wlError.value = '';
  wlSaved.value = false;
  uploadError.value = '';
  try {
    margin.value = await fetchMargin();
  } catch (err: any) {
    marginError.value = err?.response?.data?.message || 'Erro ao carregar margem';
  }
  try {
    const cfg = await fetchWhitelabel();
    copyToForm(cfg);
  } catch (err: any) {
    wlError.value = err?.response?.data?.message || 'Erro ao carregar personalização';
  }
  loading.value = false;
}

async function saveMarginValue() {
  loading.value = true;
  marginError.value = '';
  marginSaved.value = false;
  try {
    margin.value = await saveMargin(margin.value);
    marginSaved.value = true;
  } catch (err: any) {
    marginError.value = err?.response?.data?.message || 'Erro ao salvar margem';
  } finally {
    loading.value = false;
  }
}

async function saveWl() {
  loading.value = true;
  wlError.value = '';
  wlSaved.value = false;
  try {
    const saved = await saveWhitelabel(wlForm);
    copyToForm(saved);
    updateConfig(saved);
    wlSaved.value = true;
  } catch (err: any) {
    wlError.value = err?.response?.data?.message || 'Erro ao salvar personalização';
  } finally {
    loading.value = false;
  }
}

function resetWl() {
  copyToForm(defaults);
}

onMounted(loadAll);
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  max-height: 100%;
  padding-bottom: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 11px;
  color: var(--primary);
  margin: 0 0 4px;
}

.muted {
  color: var(--muted);
}

.muted.small {
  font-size: 13px;
  margin-top: 4px;
}

.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: var(--shadow);
}

.card-title {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 600;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-top: 10px;
}

input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fdfefe;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  width: 100%;
}

.btn {
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}

.btn.primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.error {
  color: #ef4444;
  margin-top: 8px;
  font-size: 13px;
}

.success {
  color: #16a34a;
  margin-top: 8px;
  font-size: 13px;
}

/* White-Label Section */
.wl-section {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text);
}

.wl-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

/* Upload */
.upload-section {
  display: flex;
  gap: 20px;
  margin-top: 14px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upload-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.upload-area {
  width: 120px;
  height: 120px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
}

.upload-area:hover {
  border-color: var(--primary);
  background: rgba(16, 180, 157, 0.04);
}

.upload-area.small {
  width: 64px;
  height: 64px;
}

.upload-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.upload-preview.small {
  padding: 4px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--muted);
}

.upload-icon {
  font-size: 28px;
  font-weight: 300;
  line-height: 1;
  color: var(--border);
}

.upload-text {
  font-size: 11px;
  text-align: center;
}

.file-hidden {
  display: none;
}

.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
  font-weight: 500;
  text-align: left;
}

.btn-remove:hover {
  text-decoration: underline;
}

/* Color inputs */
.color-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input input[type="color"] {
  width: 42px;
  height: 42px;
  padding: 2px;
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-input input[type="text"] {
  flex: 1;
}

/* Form actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

@media (max-width: 640px) {
  .wl-grid {
    grid-template-columns: 1fr;
  }

  .upload-section {
    flex-direction: column;
  }
}
</style>
