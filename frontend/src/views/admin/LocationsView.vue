<template>
  <div>
    <div class="header">
      <h3>Locais</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="reloadAllKiosks" :disabled="reloadingAll">
          {{ reloadingAll ? 'Recarregando...' : 'Atualizar Kiosks' }}
        </button>
        <button class="btn btn-ghost" @click="exportLocations">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Novo local</button>
      </div>
    </div>

    <div class="locations-grid">
      <div class="location-card glass" v-for="loc in locations" :key="loc._id" :class="{ inactive: !loc.active }">
        <div class="location-header">
          <div class="location-icon">
            <svg viewBox="0 0 24 24" fill="none" class="icon">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    fill="currentColor"/>
            </svg>
          </div>
          <div class="location-title">
            <h4 class="location-name">{{ loc.name }}</h4>
            <div class="location-code">{{ loc.code }}</div>
          </div>
          <span :class="['badge', loc.active ? 'active' : 'inactive']">
            {{ loc.active ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <div class="location-description" v-if="loc.description">
          <p>{{ loc.description }}</p>
        </div>

        <div class="location-actions">
          <button class="btn btn-ghost" @click="reloadKiosk(loc)" :disabled="reloadingId === loc._id">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" fill="currentColor"/>
            </svg>
            {{ reloadingId === loc._id ? 'Recarregando...' : 'Recarregar' }}
          </button>
          <button class="btn btn-ghost" @click="openStock(loc)">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                    fill="currentColor"/>
            </svg>
            Ver estoque
          </button>
          <button class="btn btn-ghost" @click="startEdit(loc)">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
              <path d="M12.586 3.414a2 2 0 0 1 2.828 0l1.172 1.172a2 2 0 0 1 0 2.828l-8.95 8.95-4.293 1.07 1.07-4.293 8.95-8.95Z"
                    stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
              <path d="M11 4.999 15 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
            Editar
          </button>
          <button :class="['btn', 'btn-ghost', !loc.active ? 'activate' : 'deactivate']" @click="toggle(loc)">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon" v-if="loc.active">
              <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon" v-else>
              <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 6.5c0-1.38 1.12-2.5 2.5-2.5S15 5.12 15 6.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5 8V6.5A3.5 3.5 0 0 1 11.6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ loc.active ? 'Inativar' : 'Ativar' }}
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="showForm" :title="editingId ? 'Editar local' : 'Novo local'" :onClose="closeForm">
      <form @submit.prevent="save" class="loc-form">

        <!-- Informações básicas -->
        <div class="form-section">
          <div class="form-row">
            <label class="field-grow">
              Nome
              <input v-model="form.name" required />
            </label>
            <label class="field-code">
              Código
              <input v-model="form.code" required maxlength="12" @input="form.code = form.code.toUpperCase().trim()" />
            </label>
          </div>
          <label>
            Descrição
            <textarea v-model="form.description" rows="2" placeholder="Opcional"></textarea>
          </label>
          <div class="checkbox-row">
            <input type="checkbox" v-model="form.active" />
            <span>Ativo</span>
          </div>
        </div>

        <!-- Maquininha -->
        <div class="form-section">
          <p class="section-title">
            <svg viewBox="0 0 20 20" fill="none" class="section-icon">
              <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 9h6M7 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Maquininha (Mercado Pago)
          </p>
          <label>
            Access Token
            <textarea v-model="form.mpAccessToken" autocomplete="new-password" rows="3" placeholder="Deixe em branco para usar o token global" class="token-field" spellcheck="false" />
          </label>
          <label>
            Device ID
            <small class="field-hint-top">Preencha o Access Token acima e clique em Buscar para detectar a maquininha automaticamente.</small>
            <div class="device-id-row">
              <input v-model="form.mpPointDeviceId" type="text" autocomplete="new-password" placeholder="Ex: PAX_A910__SMARTPOS123456" class="token-field" spellcheck="false" />
              <button type="button" class="btn btn-primary btn-sm device-fetch-btn" @click="fetchDevices" :disabled="fetchingDevices">
                <span v-if="fetchingDevices" class="mini-spinner"></span>
                {{ fetchingDevices ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </label>
          <p v-if="deviceMsg" class="device-msg" :class="deviceMsgType">{{ deviceMsg }}</p>
          <div v-if="deviceOptions.length > 1" class="device-options">
            <button type="button" v-for="d in deviceOptions" :key="d.id"
              class="device-option" :class="{ selected: form.mpPointDeviceId === d.id }"
              @click="selectDevice(d)">
              <span class="device-option-id">{{ d.id }}</span>
              <span v-if="d.operating_mode" class="device-option-mode">{{ d.operating_mode }}</span>
            </button>
          </div>

          <div v-if="form.mpPointDeviceId" class="pdv-block">
            <button type="button" class="pdv-btn" :class="deviceMode === 'PDV' ? 'pdv-active' : 'btn btn-primary'"
              @click="activatePdv" :disabled="activatingPdv || deviceMode === 'PDV'">
              <span v-if="activatingPdv" class="mini-spinner"></span>
              <svg v-else-if="deviceMode === 'PDV'" viewBox="0 0 16 16" fill="none" class="pdv-check">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ activatingPdv ? 'Ativando...' : deviceMode === 'PDV' ? 'Ativado' : 'Ativar modo PDV' }}
            </button>
            <small class="pdv-hint">O modo PDV permite que o sistema envie a cobrança direto pra maquininha.</small>
          </div>
          <p v-if="pdvMsg" class="device-msg" :class="pdvMsgType">{{ pdvMsg }}</p>
        </div>

        <!-- Screensaver -->
        <div class="form-section">
          <p class="section-title">
            <svg viewBox="0 0 20 20" fill="none" class="section-icon">
              <rect x="2" y="3" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 17h6M10 14v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Fundo do Screensaver
          </p>
          <div class="screensaver-layout">
            <div class="screensaver-preview"
              :style="(form.screensaverBgImageUrl && !imgError)
                ? { background: `url(${resolveAssetUrl(form.screensaverBgImageUrl)}) center/cover no-repeat` }
                : form.screensaverBgColor
                  ? { background: form.screensaverBgColor }
                  : { background: 'linear-gradient(135deg, #0c1829 0%, #1a2942 50%, #0c1829 100%)' }">
              <span class="preview-label">Preview</span>
            </div>
            <div class="screensaver-fields">
              <label>
                Cor de fundo
                <div class="color-row">
                  <input type="color" v-model="form.screensaverBgColor" />
                  <input type="text" v-model="form.screensaverBgColor" placeholder="Ex: #1a2942" />
                  <button type="button" class="btn btn-ghost btn-sm" @click="form.screensaverBgColor = ''" v-if="form.screensaverBgColor">Limpar</button>
                </div>
              </label>
              <label>
                Imagem de fundo
                <small class="field-hint-top">Tamanho ideal: 1920×1080 px (paisagem/Full HD) — tela vertical use 1080×1920. PNG, JPG ou WebP, até 5MB. A imagem cobre a tela inteira (pode cortar bordas) e sobrepõe a cor.</small>
                <div class="upload-row">
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" @change="uploadScreensaverImage" :disabled="screensaverUploading" />
                </div>
                <div class="upload-status" v-if="screensaverUploading || form.screensaverBgImageUrl">
                  <span v-if="screensaverUploading" class="uploading-text">Enviando...</span>
                  <div v-else-if="form.screensaverBgImageUrl" class="img-configured">
                    <a v-if="!imgError" :href="resolveAssetUrl(form.screensaverBgImageUrl)" target="_blank" rel="noopener" class="bg-thumb-link" title="Abrir imagem em tamanho real">
                      <img class="bg-thumb" :src="resolveAssetUrl(form.screensaverBgImageUrl)" alt="Fundo atual em uso" @error="imgError = true" @load="imgError = false" />
                    </a>
                    <div v-else class="bg-thumb bg-thumb-missing" title="Arquivo não encontrado">
                      <svg viewBox="0 0 24 24" fill="none" class="missing-icon"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z" stroke="currentColor" stroke-width="1.5"/><path d="m4 16 4-4 3 3 4-4 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m4 4 16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </div>
                    <div class="img-configured-info">
                      <span v-if="!imgError" class="img-configured-label">
                        <svg viewBox="0 0 16 16" fill="none" class="check-icon"><circle cx="8" cy="8" r="7" stroke="#22c55e" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Imagem em uso neste local
                      </span>
                      <span v-else class="img-missing-label">
                        <svg viewBox="0 0 16 16" fill="none" class="warn-icon"><path d="M8 1.5 15 14H1L8 1.5Z" stroke="#d97706" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.5v3.5M8 12h.01" stroke="#d97706" stroke-width="1.5" stroke-linecap="round"/></svg>
                        Arquivo não encontrado no servidor — reenvie a imagem.
                      </span>
                      <button type="button" class="btn btn-ghost btn-sm" @click="clearScreensaverImage">Remover</button>
                    </div>
                  </div>
                </div>
                <p v-if="uploadMsg" class="device-msg" :class="uploadMsgType">{{ uploadMsg }}</p>
              </label>
              <label>
                Cor do botão "Toque para começar"
                <small class="field-hint-top">Cor do aviso que aparece sobre o screensaver. Deixe em branco para usar a cor padrão do sistema.</small>
                <div class="color-row">
                  <input type="color" v-model="form.tapMessageColor" />
                  <input type="text" v-model="form.tapMessageColor" placeholder="Ex: #5be7c4" />
                  <button type="button" class="btn btn-ghost btn-sm" @click="form.tapMessageColor = ''" v-if="form.tapMessageColor">Limpar</button>
                </div>
                <div class="tap-preview" :style="tapPreviewStyle">
                  <span class="tap-preview-dot" />
                  Toque na tela para começar suas compras
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="closeForm">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal :open="showStockModal" title="Estoque do local" :onClose="closeStock">
      <div v-if="selectedLocation" class="stock-loc-modal">
        <header class="stock-loc-header">
          <div>
            <p class="stock-loc-label">Local</p>
            <h4 class="stock-loc-name">{{ selectedLocation.name }}</h4>
            <p class="stock-loc-code">{{ selectedLocation.code }}</p>
          </div>
          <div class="stock-loc-summary">
            <div class="stock-loc-badge" :class="selectedLocation.active ? 'active' : 'inactive'">
              {{ selectedLocation.active ? 'Ativo' : 'Inativo' }}
            </div>
            <div v-if="!loadingStock" class="product-count">
              <span class="count-number">{{ locationProducts.length }}</span>
              <span class="count-label">{{ locationProducts.length === 1 ? 'produto' : 'produtos' }}</span>
            </div>
          </div>
        </header>

        <div v-if="loadingStock" class="stock-loc-loading">
          <div class="spinner"></div>
          <p>Carregando estoque do local...</p>
        </div>
        <div v-else-if="locationProducts.length" class="stock-loc-grid">
          <div class="stock-loc-card" v-for="p in locationProducts" :key="p._id">
            <div class="stock-loc-card-header">
              <div>
                <p class="stock-loc-card-label">{{ p.barcode || '—' }}</p>
                <h5 class="stock-loc-card-title">{{ p.name }}</h5>
              </div>
              <span class="stock-loc-chip">{{ p.locationQty }} un.</span>
            </div>
            <div class="stock-loc-bar">
              <div class="stock-loc-bar-fill" :style="{ width: barWidth(p.locationQty) }"></div>
            </div>
            <div class="stock-loc-card-meta">
              <span>Custo: R$ {{ p.costPrice?.toFixed ? p.costPrice.toFixed(2) : p.costPrice }}</span>
              <span>Venda: R$ {{ p.salePrice?.toFixed ? p.salePrice.toFixed(2) : p.salePrice }}</span>
            </div>
          </div>
        </div>
        <div v-else class="stock-loc-empty">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z" fill="currentColor" opacity="0.3"/>
            <path d="M9 13h2v2H9zm4 0h2v2h-2z" fill="currentColor" opacity="0.3"/>
          </svg>
          <p>Nenhum produto com estoque neste local.</p>
          <p class="hint">Transfira produtos para este local ou realize uma entrada de estoque.</p>
        </div>

        <div class="transfer-block">
          <div class="transfer-header">
            <svg viewBox="0 0 24 24" fill="none" class="transfer-icon">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <h5>Transferir estoque</h5>
              <p class="transfer-subtitle">Mova produtos deste local para outro</p>
            </div>
          </div>

          <div class="transfer-steps">
            <div class="transfer-step">
              <div class="step-number">1</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                  Selecionar produto
                </span>
                <select v-model="transferForm.productId" :class="{ filled: transferForm.productId }">
                  <option value="" disabled>Escolha o produto para transferir</option>
                  <option v-for="p in locationProducts" :key="p._id" :value="p._id">
                    {{ p.name }} ({{ p.barcode || '-' }})
                  </option>
                </select>
              </label>
            </div>

            <div class="transfer-arrow">
              <svg viewBox="0 0 24 24" fill="none" class="arrow-icon">
                <path d="M5 12h14m0 0l-7-7m7 7l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>

            <div class="transfer-step">
              <div class="step-number">2</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                  Local de destino
                </span>
                <select v-model="transferForm.to" :class="{ filled: transferForm.to }">
                  <option value="" disabled>Selecione o local de destino</option>
                  <template v-for="loc in locations" :key="loc.code">
                    <option v-if="loc.code !== selectedLocation?.code" :value="loc.code">
                      {{ loc.name }} ({{ loc.code }})
                    </option>
                  </template>
                </select>
              </label>
            </div>

            <div class="transfer-step">
              <div class="step-number">3</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                  </svg>
                  Quantidade
                </span>
                <input type="number" min="1" v-model.number="transferForm.quantity" placeholder="Digite a quantidade" :class="{ filled: transferForm.quantity > 0 }" />
              </label>
            </div>
          </div>

          <div class="transfer-actions">
            <button class="btn btn-ghost btn-reset" type="button" @click="resetTransfer">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon-small">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
              </svg>
              Limpar
            </button>
            <button class="btn btn-primary btn-transfer" type="button" @click="submitTransfer" :disabled="!canTransfer">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon-small">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
              </svg>
              Realizar transferência
            </button>
          </div>

          <div v-if="transferError" class="transfer-alert alert-error">
            <svg viewBox="0 0 20 20" fill="currentColor" class="alert-icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            {{ transferError }}
          </div>
          <div v-if="transferSuccess" class="transfer-alert alert-success">
            <svg viewBox="0 0 20 20" fill="currentColor" class="alert-icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            {{ transferSuccess }}
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';

const locations = ref<any[]>([]);
const showForm = ref(false);
const editingId = ref<string | null>(null);
const showStockModal = ref(false);
const selectedLocation = ref<any | null>(null);
const locationProducts = ref<any[]>([]);
const loadingStock = ref(false);
const transferForm = reactive({ to: '', productId: '', quantity: 0 });
const transferError = ref('');
const transferSuccess = ref('');
const stockSummary = ref<Record<string, number>>({});
const reloadingId = ref<string | null>(null);
const reloadingAll = ref(false);
const form = reactive<any>({
  name: '',
  code: '',
  description: '',
  active: true,
  mpAccessToken: '',
  mpPointDeviceId: '',
  screensaverBgColor: '',
  screensaverBgImageUrl: '',
  tapMessageColor: '',
});

const screensaverUploading = ref(false);

const assetBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
function resolveAssetUrl(url: string): string {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  // Remove barras finais da base e garante uma única barra inicial no path,
  // evitando gerar "//uploads" (URL protocol-relative) quando a base é "/".
  const base = assetBase.replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const tapPreviewStyle = computed(() => {
  const c = form.tapMessageColor || '#5be7c4';
  return {
    color: c,
    borderColor: hexToRgba(c, 0.4),
    background: `linear-gradient(135deg, ${hexToRgba(c, 0.2)}, ${hexToRgba(c, 0.1)})`,
  };
});

const fetchingDevices = ref(false);
const deviceMsg = ref('');
const deviceMsgType = ref<'ok' | 'err'>('ok');
const deviceOptions = ref<any[]>([]);
const deviceMode = ref('');
const activatingPdv = ref(false);
const pdvMsg = ref('');
const pdvMsgType = ref<'ok' | 'err'>('ok');

function resetDeviceSearch() {
  fetchingDevices.value = false;
  deviceMsg.value = '';
  deviceOptions.value = [];
  deviceMode.value = '';
  activatingPdv.value = false;
  pdvMsg.value = '';
  uploadMsg.value = '';
}

function selectDevice(d: any) {
  form.mpPointDeviceId = d.id;
  deviceMode.value = (d.operating_mode || '').toUpperCase();
  pdvMsg.value = '';
}

async function activatePdv() {
  const token = (form.mpAccessToken || '').trim();
  const device = (form.mpPointDeviceId || '').trim();
  pdvMsg.value = '';
  if (!token || !device) {
    pdvMsgType.value = 'err';
    pdvMsg.value = 'Preencha o Access Token e o Device ID antes de ativar.';
    return;
  }
  activatingPdv.value = true;
  try {
    const { data } = await api.post('/locations/devices/configure', { accessToken: token, deviceId: device });
    deviceMode.value = (data?.mode || 'PDV').toUpperCase();
    pdvMsgType.value = 'ok';
    pdvMsg.value = 'Maquininha ativada no modo PDV.';
  } catch (err: any) {
    pdvMsgType.value = 'err';
    pdvMsg.value = err?.response?.data?.message || 'Não foi possível ativar o modo PDV.';
  } finally {
    activatingPdv.value = false;
  }
}

async function fetchDevices() {
  const token = (form.mpAccessToken || '').trim();
  deviceMsg.value = '';
  deviceOptions.value = [];
  if (!token) {
    deviceMsgType.value = 'err';
    deviceMsg.value = 'Preencha o Access Token acima antes de buscar.';
    return;
  }
  fetchingDevices.value = true;
  try {
    const { data } = await api.post('/locations/devices/list', { accessToken: token });
    const devices = data?.devices || [];
    if (!devices.length) {
      deviceMsgType.value = 'err';
      deviceMsg.value = 'Nenhuma maquininha encontrada nessa conta. Verifique se ela está pareada no Mercado Pago.';
    } else if (devices.length === 1) {
      selectDevice(devices[0]);
      deviceMsgType.value = 'ok';
      deviceMsg.value = 'Maquininha encontrada e preenchida automaticamente.';
    } else {
      deviceOptions.value = devices;
      deviceMsgType.value = 'ok';
      deviceMsg.value = `${devices.length} maquininhas encontradas — toque para selecionar.`;
    }
  } catch (err: any) {
    deviceMsgType.value = 'err';
    deviceMsg.value = err?.response?.data?.message || 'Erro ao buscar maquininhas. Verifique o Access Token.';
  } finally {
    fetchingDevices.value = false;
  }
}

const uploadMsg = ref('');
const uploadMsgType = ref<'ok' | 'err'>('ok');
// Detecta quando a imagem salva não carrega (arquivo ausente no servidor)
const imgError = ref(false);
watch(() => form.screensaverBgImageUrl, () => { imgError.value = false; });

async function uploadScreensaverImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploadMsg.value = '';
  screensaverUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/locations/upload', formData);
    if (!data?.url) {
      throw new Error('Resposta sem URL da imagem');
    }
    form.screensaverBgImageUrl = data.url;
    uploadMsgType.value = 'ok';
    uploadMsg.value = 'Imagem enviada. Clique em Salvar para aplicar neste local.';
  } catch (err: any) {
    uploadMsgType.value = 'err';
    uploadMsg.value = err?.response?.data?.message || 'Falha ao enviar a imagem. Tente novamente.';
  } finally {
    screensaverUploading.value = false;
    // permite reenviar o mesmo arquivo
    input.value = '';
  }
}

function clearScreensaverImage() {
  form.screensaverBgImageUrl = '';
  uploadMsg.value = '';
}

// Consulta o modo atual da maquininha para já mostrar "Ativado" ao abrir o editar
async function detectDeviceMode() {
  const token = (form.mpAccessToken || '').trim();
  const device = (form.mpPointDeviceId || '').trim();
  if (!token || !device) return;
  try {
    const { data } = await api.post('/locations/devices/list', { accessToken: token });
    const found = (data?.devices || []).find((d: any) => d.id === device);
    if (found) deviceMode.value = (found.operating_mode || '').toUpperCase();
  } catch {
    // silencioso: se falhar, o botão fica como "Ativar modo PDV"
  }
}

async function load() {
  const { data } = await api.get('/locations');
  locations.value = data;
}

function openForm() {
  showForm.value = true;
  editingId.value = null;
  resetDeviceSearch();
  Object.assign(form, { name: '', code: '', description: '', active: true, mpAccessToken: '', mpPointDeviceId: '', screensaverBgColor: '', screensaverBgImageUrl: '', tapMessageColor: '' });
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
  resetDeviceSearch();
}

async function startEdit(loc: any) {
  editingId.value = loc._id;
  resetDeviceSearch();
  // Preenche já com o que veio da lista para abrir o modal sem atraso
  Object.assign(form, {
    name: loc.name,
    code: loc.code,
    description: loc.description || '',
    active: loc.active,
    mpAccessToken: '',
    mpPointDeviceId: '',
    screensaverBgColor: loc.screensaverBgColor || '',
    screensaverBgImageUrl: loc.screensaverBgImageUrl || '',
    tapMessageColor: loc.tapMessageColor || '',
  });
  showForm.value = true;
  // Busca o registro completo (inclui credenciais da maquininha) do banco
  try {
    const { data } = await api.get(`/locations/${loc._id}/edit`);
    Object.assign(form, {
      name: data.name,
      code: data.code,
      description: data.description || '',
      active: data.active,
      mpAccessToken: data.mpAccessToken || '',
      mpPointDeviceId: data.mpPointDeviceId || '',
      screensaverBgColor: data.screensaverBgColor || '',
      screensaverBgImageUrl: data.screensaverBgImageUrl || loc.screensaverBgImageUrl || '',
      tapMessageColor: data.tapMessageColor || '',
    });
  } catch {
    // Mantém os dados da lista caso a busca completa falhe
  }
  // Já reflete se a maquininha está em modo PDV
  detectDeviceMode();
}

async function save() {
  const payload = { ...form, code: form.code.toUpperCase().trim() };
  if (editingId.value) {
    await api.put(`/locations/${editingId.value}`, payload);
  } else {
    await api.post('/locations', payload);
  }
  await load();
  closeForm();
}

async function toggle(loc: any) {
  await api.put(`/locations/${loc._id}`, { active: !loc.active });
  await load();
}

async function openStock(loc: any) {
  selectedLocation.value = loc;
  showStockModal.value = true;
  await loadLocationStock(loc.code);
}

function closeStock() {
  showStockModal.value = false;
  selectedLocation.value = null;
  locationProducts.value = [];
  resetTransfer();
}

async function reloadKiosk(loc: any) {
  reloadingId.value = loc._id;
  try {
    const { data } = await api.post(`/kiosks/${loc._id}/reload`);
    alert(data.message);
  } catch (err: any) {
    alert(err.response?.data?.message || 'Erro ao solicitar reload');
  } finally {
    reloadingId.value = null;
  }
}

async function reloadAllKiosks() {
  reloadingAll.value = true;
  try {
    const { data } = await api.post('/kiosks/reload-all');
    alert(data.message);
  } catch (err: any) {
    alert(err.response?.data?.message || 'Erro ao solicitar reload');
  } finally {
    reloadingAll.value = false;
  }
}

onMounted(load);

async function exportLocations() {
  const { data } = await api.get('/locations');
  const headers = ['Nome', 'Código', 'Descrição', 'Status'];
  const rows = data.map((loc: any) => [
    loc.name,
    loc.code,
    loc.description || '-',
    loc.active ? 'Ativo' : 'Inativo'
  ]);
  exportToCsv('locais.csv', headers, rows);
}

async function loadLocationStock(code: string) {
  loadingStock.value = true;
  try {
    // Busca todos os produtos sem filtro de location (a API pode não suportar esse filtro)
    const { data: summary } = await api.get('/stock-movements/summary', { params: { location: code } });
    const qtyMap: Record<string, number> = {};
    (summary || []).forEach((row: any) => {
      if (row.product) qtyMap[row.product] = Number(row.quantity || 0);
    });
    stockSummary.value = qtyMap;

    const { data } = await api.get('/products', { params: { limit: 500, page: 1 } });
    const list = data.data || data;

    locationProducts.value = list
      .map((p: any) => ({ ...p, locationQty: qtyMap[p._id] || 0 }))
      .filter((p: any) => p.locationQty > 0)
      .sort((a: any, b: any) => b.locationQty - a.locationQty);
  } catch (error) {
    console.error('Erro ao carregar estoque do local:', error);
    locationProducts.value = [];
  } finally {
    loadingStock.value = false;
  }
}

const maxQty = computed(() => Math.max(...locationProducts.value.map((p: any) => p.locationQty || 0), 1));
function barWidth(qty: number) {
  return `${Math.round((qty / maxQty.value) * 100)}%`;
}

const canTransfer = computed(() => {
  return (
    !!selectedLocation.value &&
    transferForm.to &&
    transferForm.productId &&
    transferForm.quantity > 0 &&
    transferForm.to !== selectedLocation.value?.code
  );
});

function resetTransfer() {
  transferForm.to = '';
  transferForm.productId = '';
  transferForm.quantity = 0;
  transferError.value = '';
  transferSuccess.value = '';
}

async function submitTransfer() {
  if (!selectedLocation.value || !canTransfer.value) return;
  transferError.value = '';
  transferSuccess.value = '';
  try {
    await api.post('/stock-movements/transfer', {
      productId: transferForm.productId,
      from: selectedLocation.value.code,
      to: transferForm.to,
      quantity: transferForm.quantity,
      reason: 'Transferência manual'
    });
    transferSuccess.value = 'Transferência realizada com sucesso.';
    await loadLocationStock(selectedLocation.value.code);
    resetTransfer();
  } catch (err: any) {
    transferError.value = err?.response?.data?.message || err?.message || 'Erro ao transferir estoque';
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Locations Grid */
.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.location-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  transition: all 0.3s ease;
}

.location-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.location-card.inactive {
  opacity: 0.6;
}

.location-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-icon .icon {
  width: 24px;
  height: 24px;
  color: #0c1829;
}

.location-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.location-code {
  padding: 4px 10px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  font-family: 'Courier New', monospace;
  display: inline-block;
  width: fit-content;
}

.badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge.active {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.badge.inactive {
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.3);
  color: #9ca3af;
}

.location-description {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.location-description p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
}

.location-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.location-actions .btn {
  flex: 1;
  min-width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 13px;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn.deactivate:hover {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn.activate:hover {
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stock-loc-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stock-loc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: radial-gradient(circle at 20% 20%, rgba(91, 231, 196, 0.12), transparent 50%),
    rgba(255, 255, 255, 0.02);
}

.stock-loc-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.product-count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 8px;
}

.product-count .count-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.product-count .count-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.stock-loc-label {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-size: 11px;
  color: var(--muted);
}

.stock-loc-name {
  margin: 0;
  font-size: 18px;
}

.stock-loc-code {
  margin: 2px 0 0;
  color: var(--muted);
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.stock-loc-badge {
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 12px;
}

.stock-loc-badge.active {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.stock-loc-badge.inactive {
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.3);
  color: #9ca3af;
}

.stock-loc-loading {
  padding: 32px 16px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stock-loc-loading .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(91, 231, 196, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.stock-loc-loading p {
  margin: 0;
  font-weight: 600;
}

.stock-loc-empty {
  padding: 40px 16px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stock-loc-empty .empty-icon {
  width: 64px;
  height: 64px;
  color: var(--muted);
  opacity: 0.5;
}

.stock-loc-empty p {
  margin: 0;
  font-weight: 600;
}

.stock-loc-empty .hint {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.8;
}

.stock-loc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.stock-loc-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stock-loc-card-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.stock-loc-card-label {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.stock-loc-card-title {
  margin: 2px 0 0;
  font-size: 15px;
}

.stock-loc-chip {
  padding: 6px 10px;
  background: rgba(91, 231, 196, 0.12);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 999px;
  font-weight: 700;
  color: var(--primary);
  font-size: 13px;
}

.stock-loc-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
}

.stock-loc-bar-fill {
  height: 100%;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
}

.stock-loc-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.transfer-block {
  margin-top: 20px;
  padding: 20px;
  border: 2px solid rgba(91, 231, 196, 0.2);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.03), rgba(91, 231, 196, 0.01));
  box-shadow: 0 4px 20px rgba(91, 231, 196, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.transfer-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(91, 231, 196, 0.15);
}

.transfer-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  padding: 8px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.15), rgba(91, 231, 196, 0.25));
  border-radius: 10px;
  color: var(--primary);
}

.transfer-header h5 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.transfer-subtitle {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: var(--muted);
}

.transfer-steps {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}

.transfer-step {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.3);
}

.step-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.label-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.label-icon {
  width: 16px;
  height: 16px;
  color: var(--primary);
}

.step-label select,
.step-label input {
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
  font-size: 14px;
}

.step-label select:hover,
.step-label input:hover {
  border-color: rgba(91, 231, 196, 0.3);
}

.step-label select:focus,
.step-label input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(91, 231, 196, 0.1);
  outline: none;
}

.step-label select.filled,
.step-label input.filled {
  border-color: rgba(91, 231, 196, 0.5);
  background: rgba(91, 231, 196, 0.05);
}

.transfer-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.arrow-icon {
  width: 24px;
  height: 24px;
  color: var(--primary);
  opacity: 0.5;
}

.transfer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(91, 231, 196, 0.1);
}

.btn-icon-small {
  width: 18px;
  height: 18px;
}

.btn-reset:hover {
  background: rgba(156, 163, 175, 0.1);
  border-color: rgba(156, 163, 175, 0.3);
}

.btn-transfer {
  position: relative;
  overflow: hidden;
}

.btn-transfer:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(91, 231, 196, 0.3);
}

.btn-transfer:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.transfer-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.span-2 {
  grid-column: span 2;
}
.loc-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}
.form-section:last-of-type {
  border-bottom: none;
}
.form-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.field-grow {
  flex: 1;
}
.field-code {
  width: 120px;
  flex-shrink: 0;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.section-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}
.screensaver-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.screensaver-preview {
  width: 110px;
  height: 74px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}
.preview-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}
.screensaver-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.color-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}
.color-row input[type="color"] {
  width: 34px;
  height: 34px;
  padding: 2px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.color-row input[type="text"] {
  flex: 1;
}
.tap-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 14px;
  border: 2px solid;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}
.tap-preview-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid currentColor;
  flex-shrink: 0;
}
.upload-row {
  margin-top: 4px;
}
.field-hint-top {
  display: block;
  color: var(--muted);
  font-size: 12px;
  margin-top: 2px;
  margin-bottom: 4px;
}
.upload-status {
  margin-top: 6px;
}
.uploading-text {
  font-size: 13px;
  color: var(--muted);
}
.img-configured {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.bg-thumb-link {
  flex-shrink: 0;
  line-height: 0;
}
.bg-thumb {
  width: 96px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
  display: block;
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.bg-thumb-link:hover .bg-thumb {
  transform: scale(1.03);
  box-shadow: 0 4px 14px rgba(31, 41, 55, 0.18);
}
.img-configured-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.img-configured-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #16a34a;
  font-weight: 500;
}
.bg-thumb-missing {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff7ed;
  border-color: #fdba74;
  color: #d97706;
}
.missing-icon {
  width: 28px;
  height: 28px;
}
.img-missing-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b45309;
  font-weight: 500;
  max-width: 240px;
  line-height: 1.35;
}
.warn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.check-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
.loc-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.loc-form input,
.loc-form textarea {
  width: 100%;
  background: #fdfefe;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 13px 14px;
  border-radius: 10px;
  font-family: inherit;
  /* 16px evita o zoom automático ao tocar em campos no tablet/celular */
  font-size: 16px;
  font-weight: 400;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.loc-form input:not([type="checkbox"]):not([type="color"]) {
  min-height: 48px;
}
.loc-form input::placeholder,
.loc-form textarea::placeholder {
  color: #9aa5b5;
}
.loc-form input:focus,
.loc-form textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16, 180, 157, 0.16);
}
.loc-form input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}
.loc-form input[type="color"] {
  padding: 2px;
}
.loc-form .checkbox-row {
  font-size: 14px;
  font-weight: 500;
}
.loc-form .token-field {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  letter-spacing: 0.02em;
  resize: none;
}
.device-id-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.device-id-row input {
  flex: 1;
}
.device-fetch-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  min-height: 48px;
  padding-left: 18px;
  padding-right: 18px;
}
.device-fetch-btn:disabled {
  opacity: 0.65;
  cursor: default;
}
.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.device-msg {
  margin: 2px 0 0;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
}
.device-msg.ok {
  color: #0e7a5f;
  background: rgba(16, 180, 157, 0.1);
  border: 1px solid rgba(16, 180, 157, 0.25);
}
.device-msg.err {
  color: #b42318;
  background: rgba(244, 63, 63, 0.08);
  border: 1px solid rgba(244, 63, 63, 0.22);
}
.device-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.device-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px;
  min-height: 52px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  text-align: left;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--text);
}
.device-option:hover {
  border-color: var(--primary);
}
.device-option.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(16, 180, 157, 0.18);
}
.device-option-mode {
  font-family: inherit;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  background: var(--surface-2);
  padding: 2px 8px;
  border-radius: 999px;
}
.pdv-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.pdv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  align-self: flex-start;
}
.pdv-btn:disabled {
  cursor: default;
}
.pdv-btn.pdv-active {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #16a34a;
  opacity: 1;
}
.pdv-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.pdv-hint {
  color: var(--muted);
  font-size: 12px;
}
.modal-form textarea {
  width: 100%;
  resize: vertical;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}

/* Responsive */
@media (max-width: 1024px) {
  .transfer-steps {
    grid-template-columns: 1fr;
  }

  .transfer-arrow {
    display: none;
  }
}

/* Tablet (retrato e telas estreitas): empilha linhas e aumenta alvos de toque */
@media (max-width: 820px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
  .field-code {
    width: 100%;
  }
  .device-id-row {
    flex-direction: column;
  }
  .device-fetch-btn {
    width: 100%;
  }
  .screensaver-layout {
    flex-direction: column;
  }
  .screensaver-preview {
    width: 100%;
    height: 120px;
  }
  .color-row {
    flex-wrap: wrap;
  }
  .modal-actions .btn {
    flex: 1;
    min-height: 50px;
  }
}

/* Dispositivos de toque: garante alvos confortáveis independente da largura */
@media (pointer: coarse) {
  .device-option {
    min-height: 56px;
  }
  .loc-form input[type="file"] {
    padding: 12px;
  }
  .img-configured .btn-sm,
  .color-row .btn-sm {
    min-height: 40px;
    padding: 8px 14px;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .locations-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .location-actions {
    flex-direction: column;
  }

  .location-actions .btn {
    width: 100%;
  }
}

</style>
