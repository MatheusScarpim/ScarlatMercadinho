import axios from 'axios';

const SCRAPE_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 15000);

/**
 * Busca o nome do produto via Open Food Facts API (gratuita, sem anti-bot).
 * Fallback: tenta também o Cosmos CDN.
 */
export async function scrapeProductName(ean: string): Promise<string | null> {
  // 1. Tenta Open Food Facts
  const offName = await tryOpenFoodFacts(ean);
  if (offName) return offName;

  // 2. Fallback: tenta Cosmos (bluesoft)
  const cosmosName = await tryCosmos(ean);
  if (cosmosName) return cosmosName;

  console.warn('[PRODUCT-SEARCH] Nenhuma fonte encontrou o EAN:', ean);
  return null;
}

async function tryOpenFoodFacts(ean: string): Promise<string | null> {
  try {
    console.log('[PRODUCT-SEARCH] Tentando Open Food Facts para EAN:', ean);
    const { data } = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${ean}.json`,
      {
        timeout: SCRAPE_TIMEOUT_MS,
        headers: {
          'User-Agent': 'ScarlatMercadinho/1.0 (product lookup)',
        },
      },
    );

    if (data?.status === 1 && data?.product) {
      const product = data.product;
      // Prioridade: nome genérico em pt > nome do produto > marca + nome
      const name =
        product.product_name_pt_br ||
        product.product_name_pt ||
        product.product_name ||
        (product.brands && product.generic_name
          ? `${product.brands} ${product.generic_name}`
          : null);

      console.log('[PRODUCT-SEARCH] Open Food Facts encontrou:', name);
      console.log('[PRODUCT-SEARCH] OFF detalhes:', {
        product_name: product.product_name,
        product_name_pt: product.product_name_pt,
        product_name_pt_br: product.product_name_pt_br,
        brands: product.brands,
        generic_name: product.generic_name,
        quantity: product.quantity,
      });

      return name?.trim() || null;
    }

    console.log('[PRODUCT-SEARCH] Open Food Facts: produto não encontrado (status:', data?.status, ')');
    return null;
  } catch (err: any) {
    console.warn('[PRODUCT-SEARCH] Erro Open Food Facts:', err?.message);
    return null;
  }
}

async function tryCosmos(ean: string): Promise<string | null> {
  try {
    console.log('[PRODUCT-SEARCH] Tentando Cosmos para EAN:', ean);
    const { data } = await axios.get(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      {
        timeout: SCRAPE_TIMEOUT_MS,
        headers: {
          'User-Agent': 'ScarlatMercadinho/1.0',
          'X-Cosmos-Token': process.env.COSMOS_API_TOKEN || '',
        },
      },
    );

    const name = data?.description || data?.commercial_name || null;
    console.log('[PRODUCT-SEARCH] Cosmos encontrou:', name);
    return name?.trim() || null;
  } catch (err: any) {
    // 401/403 = sem token, 404 = não encontrado
    if (err?.response?.status === 404) {
      console.log('[PRODUCT-SEARCH] Cosmos: produto não encontrado');
    } else if (err?.response?.status === 401 || err?.response?.status === 403) {
      console.log('[PRODUCT-SEARCH] Cosmos: sem token ou token inválido');
    } else {
      console.warn('[PRODUCT-SEARCH] Erro Cosmos:', err?.message);
    }
    return null;
  }
}
