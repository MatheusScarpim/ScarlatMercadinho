import axios from 'axios';
import { ProductModel } from '../models/Product';
import { GtinLookupModel } from '../models/GtinLookup';
import { CategoryModel } from '../models/Category';

// ── Multi-key config ────────────────────────────────────────────────
// .env: COSMOS_API_TOKEN=key1,key2   SERPAPI_KEY=key1,key2
function parseKeys(envVar: string): string[] {
  const val = process.env[envVar] || '';
  return val.split(',').map((k) => k.trim()).filter(Boolean);
}

const COSMOS_TOKENS = parseKeys('COSMOS_API_TOKEN');
const SERPAPI_KEYS = parseKeys('SERPAPI_KEY');
const COSMOS_LIMIT_PER_KEY = Number(process.env.COSMOS_DAILY_LIMIT ?? 25);
const SERPAPI_LIMIT_PER_KEY = Number(process.env.SERPAPI_MONTHLY_LIMIT ?? 250);
const DELAY_MS = Number(process.env.REFRESH_DELAY_MS ?? 1000);

// Limite total = soma de todas as keys
const COSMOS_TOTAL_LIMIT = COSMOS_LIMIT_PER_KEY * COSMOS_TOKENS.length;
const SERPAPI_TOTAL_LIMIT = SERPAPI_LIMIT_PER_KEY * SERPAPI_KEYS.length;

// Contadores por key
const cosmosKeyUsage: number[] = COSMOS_TOKENS.map(() => 0);
const serpKeyUsage: number[] = SERPAPI_KEYS.map(() => 0);

function getAvailableCosmosKey(): { token: string; index: number } | null {
  for (let i = 0; i < COSMOS_TOKENS.length; i++) {
    if (cosmosKeyUsage[i] < COSMOS_LIMIT_PER_KEY) {
      return { token: COSMOS_TOKENS[i], index: i };
    }
  }
  return null;
}

function getAvailableSerpKey(): { key: string; index: number } | null {
  for (let i = 0; i < SERPAPI_KEYS.length; i++) {
    if (serpKeyUsage[i] < SERPAPI_LIMIT_PER_KEY) {
      return { key: SERPAPI_KEYS[i], index: i };
    }
  }
  return null;
}

// ── Estado global do job ────────────────────────────────────────────
interface RefreshState {
  running: boolean;
  total: number;
  processed: number;
  updated: number;
  noChanges: number;
  failed: number;
  cosmosUsed: number;
  cosmosTotal: number;
  serpUsed: number;
  serpTotal: number;
  currentProduct: string | null;
  stoppedReason: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

const state: RefreshState = {
  running: false,
  total: 0,
  processed: 0,
  updated: 0,
  noChanges: 0,
  failed: 0,
  cosmosUsed: 0,
  cosmosTotal: COSMOS_TOTAL_LIMIT,
  serpUsed: 0,
  serpTotal: SERPAPI_TOTAL_LIMIT,
  currentProduct: null,
  stoppedReason: null,
  startedAt: null,
  finishedAt: null,
};

let abortRequested = false;
type Listener = (event: string, data: any) => void;
const listeners: Set<Listener> = new Set();

function emit(event: string, data: any) {
  for (const fn of listeners) {
    try { fn(event, data); } catch {}
  }
}

export function subscribeRefresh(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getRefreshStatus() {
  return { ...state };
}

export function abortRefresh() {
  if (state.running) {
    abortRequested = true;
    return true;
  }
  return false;
}

// ── APIs ────────────────────────────────────────────────────────────
async function fetchCosmos(ean: string) {
  const keyInfo = getAvailableCosmosKey();
  if (!keyInfo) return null;
  try {
    cosmosKeyUsage[keyInfo.index]++;
    state.cosmosUsed++;
    const { data } = await axios.get(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      {
        timeout: 10000,
        headers: { 'X-Cosmos-Token': keyInfo.token, 'User-Agent': 'ScarlatMercadinho/1.0' },
      },
    );
    return data;
  } catch (err: any) {
    if (err?.response?.status === 429) {
      // Esgotou essa key
      cosmosKeyUsage[keyInfo.index] = COSMOS_LIMIT_PER_KEY;
    }
    return null;
  }
}

function removeOutliers(raw: number[]): number[] {
  if (raw.length < 2) return raw;
  const sorted = [...raw].sort((a, b) => a - b);

  // Agrupar preços próximos — gap > 2x = cluster novo
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] > sorted[i - 1] * 2) {
      clusters.push([sorted[i]]);
    } else {
      clusters[clusters.length - 1].push(sorted[i]);
    }
  }

  // Pegar o cluster mais populoso (preço unitário real)
  const biggest = clusters.reduce((a, b) => (a.length >= b.length ? a : b));

  // IQR como refinamento se tiver amostra
  if (biggest.length >= 4) {
    const q1 = biggest[Math.floor(biggest.length * 0.25)];
    const q3 = biggest[Math.floor(biggest.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const refined = biggest.filter((p) => p >= lower && p <= upper);
    if (refined.length) return refined;
  }

  return biggest;
}

/**
 * Sanitiza preços do Cosmos — max/avg deles inclui caixa/atacado.
 * Regra: no varejo unitário, min é o preço real mais confiável.
 * Se avg ou max são muito maiores que min, estão poluídos por atacado.
 */
function sanitizePrices(p: { min: number | null; avg: number | null; max: number | null }) {
  let { min, avg, max } = p;

  if (max && avg && max > avg * 2) {
    max = Math.round(avg * 1.5 * 100) / 100;
  }

  if (min && avg && min < avg * 0.3) {
    min = Math.round(avg * 0.7 * 100) / 100;
  }

  return { min, avg, max };
}

async function fetchSerpPrices(productName: string) {
  const keyInfo = getAvailableSerpKey();
  if (!keyInfo) return null;
  try {
    serpKeyUsage[keyInfo.index]++;
    state.serpUsed++;
    const { data } = await axios.get('https://serpapi.com/search.json', {
      params: { engine: 'google_shopping', q: productName, gl: 'br', hl: 'pt', api_key: keyInfo.key },
      timeout: 12000,
    });
    const raw: number[] = (data.shopping_results || [])
      .map((r: any) => parseFloat(r.extracted_price))
      .filter((p: number) => !isNaN(p) && p > 0);
    if (!raw.length) return null;
    const prices = removeOutliers(raw);
    prices.sort((a, b) => a - b);
    return {
      min: Math.round(prices[0] * 100) / 100,
      avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      max: Math.round(prices[prices.length - 1] * 100) / 100,
    };
  } catch (err: any) {
    if (err?.response?.status === 429) {
      serpKeyUsage[keyInfo.index] = SERPAPI_LIMIT_PER_KEY;
    }
    return null;
  }
}

async function ensureCategory(name: string | null) {
  const normalized = (name || 'OUTROS').toUpperCase();
  const existing = await CategoryModel.findOne({ name: normalized }).lean();
  if (existing) return existing._id?.toString() ?? null;
  const created = await CategoryModel.create({ name: normalized, active: true });
  return created._id?.toString() ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Job principal ───────────────────────────────────────────────────
export async function startRefresh(forceAll = false) {
  if (state.running) throw new Error('Refresh já está rodando');

  // Reset state
  state.running = true;
  state.total = 0;
  state.processed = 0;
  state.updated = 0;
  state.noChanges = 0;
  state.failed = 0;
  state.cosmosUsed = 0;
  state.cosmosTotal = COSMOS_TOTAL_LIMIT;
  state.serpUsed = 0;
  state.serpTotal = SERPAPI_TOTAL_LIMIT;
  state.currentProduct = null;
  state.stoppedReason = null;
  state.startedAt = new Date();
  state.finishedAt = null;
  abortRequested = false;

  // Reset contadores por key
  cosmosKeyUsage.fill(0);
  serpKeyUsage.fill(0);

  try {
    const allProducts = await ProductModel.find({}).lean();

    const processedLookups = forceAll
      ? []
      : await GtinLookupModel.find({ refreshedAt: { $ne: null } }).select('ean').lean();
    const processedEans = new Set(processedLookups.map((l) => l.ean));

    const pendentes = allProducts.filter((p) => p.barcode && !processedEans.has(p.barcode));
    state.total = pendentes.length;

    emit('start', {
      total: pendentes.length,
      jaProcessados: allProducts.length - pendentes.length,
      cosmosKeys: COSMOS_TOKENS.length,
      cosmosLimitTotal: COSMOS_TOTAL_LIMIT,
      serpKeys: SERPAPI_KEYS.length,
      serpLimitTotal: SERPAPI_TOTAL_LIMIT,
    });

    for (let i = 0; i < pendentes.length; i++) {
      if (abortRequested) {
        state.stoppedReason = 'Cancelado pelo usuário';
        emit('stopped', { reason: state.stoppedReason });
        break;
      }

      if (!getAvailableCosmosKey()) {
        state.stoppedReason = `Todas as keys Cosmos esgotadas (${COSMOS_TOKENS.length} keys × ${COSMOS_LIMIT_PER_KEY}/dia = ${COSMOS_TOTAL_LIMIT} total)`;
        emit('stopped', { reason: state.stoppedReason, restantes: pendentes.length - i });
        break;
      }

      const product = pendentes[i];
      const ean = product.barcode;
      state.currentProduct = `${ean} - ${(product.name || '?').substring(0, 40)}`;
      state.processed = i + 1;

      try {
        const cosmos = await fetchCosmos(ean);

        let minPrice: number | null = null;
        let avgPrice: number | null = null;
        let maxPrice: number | null = null;
        let ncm: string | null = null;
        let imageUrl: string | null = null;
        let categoryName: string | null = null;
        let cosmosName: string | null = null;
        let priceSource = 'cosmos-api';

        if (cosmos) {
          cosmosName = cosmos.description ?? null;
          const rawMin = cosmos.min_price && cosmos.min_price > 0 ? cosmos.min_price : null;
          let rawAvg = cosmos.avg_price && cosmos.avg_price > 0 ? cosmos.avg_price : null;
          const rawMax = cosmos.max_price && cosmos.max_price > 0 ? cosmos.max_price : null;
          if (!rawAvg && cosmos.price && cosmos.price > 0) rawAvg = cosmos.price;

          const sanitized = sanitizePrices({ min: rawMin, avg: rawAvg, max: rawMax });
          minPrice = sanitized.min;
          avgPrice = sanitized.avg;
          maxPrice = sanitized.max;

          ncm = cosmos.ncm?.code ?? null;
          imageUrl = cosmos.thumbnail ?? null;
          categoryName = cosmos.category?.description ?? null;
        }

        if (!avgPrice && getAvailableSerpKey()) {
          const serp = await fetchSerpPrices(product.name || ean);
          if (serp) {
            minPrice = minPrice ?? serp.min;
            avgPrice = serp.avg;
            maxPrice = maxPrice ?? serp.max;
            priceSource = 'serpapi';
          }
        }

        // Atualizar Product
        const productUpdate: any = {};
        if (minPrice !== null) productUpdate.minPrice = minPrice;
        if (avgPrice !== null) productUpdate.avgPrice = avgPrice;
        if (maxPrice !== null) productUpdate.maxPrice = maxPrice;
        if (ncm && !product.ncm) productUpdate.ncm = ncm;
        if (imageUrl) productUpdate.imageUrl = imageUrl;

        if (categoryName) {
          const currentCat = await CategoryModel.findById(product.category).lean();
          if (!currentCat || currentCat.name === 'OUTROS') {
            const newCatId = await ensureCategory(categoryName);
            if (newCatId) productUpdate.category = newCatId;
          }
        }

        if (Object.keys(productUpdate).length > 0) {
          await ProductModel.updateOne({ _id: product._id }, { $set: productUpdate });
          state.updated++;
        } else {
          state.noChanges++;
        }

        // Atualizar GtinLookup
        const finalName = cosmosName || product.name || null;
        const finalCategory = categoryName?.toUpperCase() ?? null;

        await GtinLookupModel.updateOne(
          { ean },
          {
            $set: {
              name: finalName,
              description: finalName,
              globalProductCategory: finalCategory,
              categoryId: productUpdate.category ?? product.category?.toString() ?? null,
              categoryName: finalCategory,
              imageUrl: imageUrl ?? product.imageUrl ?? null,
              averagePrice: avgPrice ? String(avgPrice) : null,
              minPrice: minPrice ? String(minPrice) : null,
              maxPrice: maxPrice ? String(maxPrice) : null,
              sourceUrl: priceSource,
              refreshedAt: new Date(),
            },
          },
          { upsert: true },
        );

        emit('product', {
          index: i + 1,
          total: pendentes.length,
          ean,
          name: product.name,
          minPrice,
          avgPrice,
          maxPrice,
          source: priceSource,
          status: Object.keys(productUpdate).length > 0 ? 'updated' : 'no_changes',
        });
      } catch (err: any) {
        state.failed++;
        emit('error', { ean, name: product.name, error: err?.message });
      }

      if (i < pendentes.length - 1) await sleep(DELAY_MS);
    }
  } catch (err: any) {
    state.stoppedReason = err?.message ?? 'Erro desconhecido';
    emit('stopped', { reason: state.stoppedReason });
  } finally {
    state.running = false;
    state.currentProduct = null;
    state.finishedAt = new Date();
    emit('done', getRefreshStatus());
  }
}
