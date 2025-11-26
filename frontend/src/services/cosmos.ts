import api from './api';

export interface CosmosProduct {
  ean: string;
  name: string | null;
  description: string | null;
  averagePrice: string | null;
  imageUrl: string | null;
  globalProductCategory?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  url: string;
}

export async function fetchCosmosProduct(ean: string, name?: string) {
  const { data } = await api.get<CosmosProduct>(`/cosmos/${ean}`, {
    params: name ? { name } : undefined,
  });
  return data;
}
