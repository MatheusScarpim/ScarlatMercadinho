import { SettingModel } from '../models/Setting';

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const found = await SettingModel.findOne({ key }).lean();
  if (found && found.value !== undefined) return found.value as T;
  return defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<T> {
  await SettingModel.updateOne({ key }, { value }, { upsert: true, setDefaultsOnInsert: true });
  return value;
}

const MARGIN_KEY = 'defaultMarginPercent';
const DEFAULT_MARGIN = 0;
const WHITELABEL_KEY = 'whitelabel';

export interface WhiteLabelSettings {
  brandName: string;
  brandSubtitle: string;
  pageTitle: string;
  logoUrl: string;
  faviconUrl: string;
  theme: {
    primary: string;
    primaryStrong: string;
    bg: string;
    surface: string;
    surface2: string;
    text: string;
    muted: string;
    border: string;
    radius: string;
  };
  labels: {
    loginEyebrow: string;
    adminEyebrow: string;
    adminTitle: string;
    paymentDescription: string;
  };
}

const DEFAULT_WHITELABEL: WhiteLabelSettings = {
  brandName: 'Asyncx',
  brandSubtitle: 'Market',
  pageTitle: 'Asyncx Market',
  logoUrl: '',
  faviconUrl: '',
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
};

export async function getWhiteLabelSettings(): Promise<WhiteLabelSettings> {
  const saved = await getSetting<Partial<WhiteLabelSettings>>(WHITELABEL_KEY, {});
  return {
    ...DEFAULT_WHITELABEL,
    ...saved,
    theme: { ...DEFAULT_WHITELABEL.theme, ...(saved?.theme || {}) },
    labels: { ...DEFAULT_WHITELABEL.labels, ...(saved?.labels || {}) },
  };
}

export async function saveWhiteLabelSettings(value: Partial<WhiteLabelSettings>): Promise<WhiteLabelSettings> {
  const current = await getWhiteLabelSettings();
  const merged: WhiteLabelSettings = {
    ...current,
    ...value,
    theme: { ...current.theme, ...(value?.theme || {}) },
    labels: { ...current.labels, ...(value?.labels || {}) },
  };
  await setSetting(WHITELABEL_KEY, merged);
  return merged;
}

export async function getMarginPercent(): Promise<number> {
  const margin = await getSetting<number>(MARGIN_KEY, DEFAULT_MARGIN);
  return Number.isFinite(margin) ? margin : DEFAULT_MARGIN;
}

export async function saveMarginPercent(value: number): Promise<number> {
  const safe = Number.isFinite(value) ? Math.max(0, value) : DEFAULT_MARGIN;
  await setSetting<number>(MARGIN_KEY, safe);
  return safe;
}
