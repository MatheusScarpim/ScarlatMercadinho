import axios from 'axios';
import api from './api';
import type { WhiteLabelConfig } from '../config/whitelabel';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function fetchMargin(): Promise<number> {
  const { data } = await api.get('/settings/margin');
  return data.marginPercent ?? 0;
}

export async function saveMargin(marginPercent: number): Promise<number> {
  const { data } = await api.put('/settings/margin', { marginPercent });
  return data.marginPercent ?? marginPercent;
}

// Usa axios puro (sem Pinia) para poder ser chamado no boot antes do app montar
export async function fetchWhitelabel(): Promise<WhiteLabelConfig> {
  const { data } = await axios.get(`${baseURL}/settings/whitelabel`);
  return data;
}

export async function saveWhitelabel(config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
  const { data } = await api.put('/settings/whitelabel', config);
  return data;
}

export async function uploadBrandImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/settings/whitelabel/upload', form);
  return data.url;
}
