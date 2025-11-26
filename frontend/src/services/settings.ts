import api from './api';

export async function fetchMargin(): Promise<number> {
  const { data } = await api.get('/settings/margin');
  return data.marginPercent ?? 0;
}

export async function saveMargin(marginPercent: number): Promise<number> {
  const { data } = await api.put('/settings/margin', { marginPercent });
  return data.marginPercent ?? marginPercent;
}
