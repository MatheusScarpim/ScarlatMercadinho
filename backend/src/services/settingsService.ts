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

export async function getMarginPercent(): Promise<number> {
  const margin = await getSetting<number>(MARGIN_KEY, DEFAULT_MARGIN);
  return Number.isFinite(margin) ? margin : DEFAULT_MARGIN;
}

export async function saveMarginPercent(value: number): Promise<number> {
  const safe = Number.isFinite(value) ? Math.max(0, value) : DEFAULT_MARGIN;
  await setSetting<number>(MARGIN_KEY, safe);
  return safe;
}
