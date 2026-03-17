// ─── White-Label Configuration ──────────────────────────────────────────────
// Configuração centralizada de marca.
// Os valores abaixo são os padrões. O sistema carrega do banco (API)
// e sobrescreve estes valores ao iniciar.
// ─────────────────────────────────────────────────────────────────────────────

export interface WhiteLabelConfig {
  brandName: string
  brandSubtitle: string
  pageTitle: string
  logoUrl: string
  faviconUrl: string
  launchDate: string
  theme: {
    primary: string
    primaryStrong: string
    bg: string
    surface: string
    surface2: string
    text: string
    muted: string
    border: string
    radius: string
  }
  labels: {
    loginEyebrow: string
    adminEyebrow: string
    adminTitle: string
    paymentDescription: string
  }
  contactPhone: string
  contactEmail: string
}

export const defaults: WhiteLabelConfig = {
  brandName: 'Asyncx',
  brandSubtitle: 'Market',
  pageTitle: 'Asyncx Market',
  logoUrl: '',
  faviconUrl: '',
  launchDate: '',
  theme: {
    primary: '#10b49d',
    primaryStrong: '#0e9c87',
    bg: '#f6f8fb',
    surface: '#ffffff',
    surface2: '#f0f5f7',
    text: '#1f2937',
    muted: '#5b6577',
    border: '#d9e2ec',
    radius: '12px',
  },
  labels: {
    loginEyebrow: 'painel',
    adminEyebrow: 'admin',
    adminTitle: 'Backoffice',
    paymentDescription: 'Pagamento',
  },
  contactPhone: '',
  contactEmail: '',
}

// Estado reativo global - começa com os defaults, depois é atualizado pela API
import { reactive } from 'vue'

const wl: WhiteLabelConfig = reactive({ ...defaults, theme: { ...defaults.theme }, labels: { ...defaults.labels } })

export default wl

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export function resolveAssetUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  return `${apiBase}${url}`
}

// Atualiza o objeto reativo com novos valores
export function updateConfig(cfg: Partial<WhiteLabelConfig>): void {
  if (cfg.brandName !== undefined) wl.brandName = cfg.brandName
  if (cfg.brandSubtitle !== undefined) wl.brandSubtitle = cfg.brandSubtitle
  if (cfg.pageTitle !== undefined) wl.pageTitle = cfg.pageTitle
  if (cfg.logoUrl !== undefined) wl.logoUrl = cfg.logoUrl
  if (cfg.faviconUrl !== undefined) wl.faviconUrl = cfg.faviconUrl
  if (cfg.launchDate !== undefined) wl.launchDate = cfg.launchDate
  if (cfg.contactPhone !== undefined) wl.contactPhone = cfg.contactPhone
  if (cfg.contactEmail !== undefined) wl.contactEmail = cfg.contactEmail
  if (cfg.theme) Object.assign(wl.theme, cfg.theme)
  if (cfg.labels) Object.assign(wl.labels, cfg.labels)
  applyTheme(wl)
}

// Aplica as variáveis CSS do tema no :root
export function applyTheme(cfg: WhiteLabelConfig = wl): void {
  const root = document.documentElement
  root.style.setProperty('--primary', cfg.theme.primary)
  root.style.setProperty('--primary-strong', cfg.theme.primaryStrong)
  root.style.setProperty('--bg', cfg.theme.bg)
  root.style.setProperty('--surface', cfg.theme.surface)
  root.style.setProperty('--surface-2', cfg.theme.surface2)
  root.style.setProperty('--text', cfg.theme.text)
  root.style.setProperty('--muted', cfg.theme.muted)
  root.style.setProperty('--border', cfg.theme.border)
  root.style.setProperty('--radius', cfg.theme.radius)

  document.title = cfg.pageTitle

  if (cfg.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = resolveAssetUrl(cfg.faviconUrl)
  }
}
