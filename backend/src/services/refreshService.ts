import axios from 'axios';
import { ProductModel } from '../models/Product';
import { GtinLookupModel } from '../models/GtinLookup';
import { CategoryModel } from '../models/Category';

const COSMOS_API_TOKEN = process.env.COSMOS_API_TOKEN || '';
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const COSMOS_DAILY_LIMIT = Number(process.env.COSMOS_DAILY_LIMIT ?? 25);
const SERPAPI_MONTHLY_LIMIT = Number(process.env.SERPAPI_MONTHLY_LIMIT ?? 250);
const DELAY_MS = Number(process.env.REFRESH_DELAY_MS ?? 1000);

// ── Estado global do job ────────────────────────────────────────────
interface RefreshState {
  running: boolean;
  total: number;
  processed: number;
  updated: number;
  noChanges: number;
  failed: number;
  cosmosUsed: number;
  serpUsed: number;
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
  serpUsed: 0,
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
  if (!COSMOS_API_TOKEN || state.cosmosUsed >= COSMOS_DAILY_LIMIT) return null;
  try {
    state.cosmosUsed++;
    const { data } = await axios.get(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      {
        timeout: 10000,
        headers: { 'X-Cosmos-Token': COSMOS_API_TOKEN, 'User-Agent': 'ScarlatMercadinho/1.0' },
      },
    );
    return data;
  } catch (err: any) {
    if (err?.response?.status === 429) state.cosmosUsed = COSMOS_DAILY_LIMIT;
    return null;
  }
}

async function fetchSerpPrices(productName: string) {
  if (!SERPAPI_KEY || state.serpUsed >= SERPAPI_MONTHLY_LIMIT) return null;
  try {
    state.serpUsed++;
    const { data } = await axios.get('https://serpapi.com/search.json', {
      params: { engine: 'google_shopping', q: productName, gl: 'br', hl: 'pt', api_key: SERPAPI_KEY },
      timeout: 12000,
    });
    const prices: number[] = (data.shopping_results || [])
      .map((r: any) => parseFloat(r.extracted_price))
      .filter((p: number) => !isNaN(p) && p > 0);
    if (!prices.length) return null;
    prices.sort((a, b) => a - b);
    return {
      min: Math.round(prices[0] * 100) / 100,
      avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      max: Math.round(prices[prices.length - 1] * 100) / 100,
    };
  } catch {
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
  state.serpUsed = 0;
  state.currentProduct = null;
  state.stoppedReason = null;
  state.startedAt = new Date();
  state.finishedAt = null;
  abortRequested = false;

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
      cosmosLimit: COSMOS_DAILY_LIMIT,
      serpLimit: SERPAPI_KEY ? SERPAPI_MONTHLY_LIMIT : 0,
    });

    for (let i = 0; i < pendentes.length; i++) {
      if (abortRequested) {
        state.stoppedReason = 'Cancelado pelo usuário';
        emit('stopped', { reason: state.stoppedReason });
        break;
      }

      if (state.cosmosUsed >= COSMOS_DAILY_LIMIT) {
        state.stoppedReason = `Limite diário Cosmos (${COSMOS_DAILY_LIMIT})`;
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
          minPrice = cosmos.min_price && cosmos.min_price > 0 ? cosmos.min_price : null;
          avgPrice = cosmos.avg_price && cosmos.avg_price > 0 ? cosmos.avg_price : null;
          maxPrice = cosmos.max_price && cosmos.max_price > 0 ? cosmos.max_price : null;
          if (!avgPrice && cosmos.price && cosmos.price > 0) avgPrice = cosmos.price;
          ncm = cosmos.ncm?.code ?? null;
          imageUrl = cosmos.thumbnail ?? null;
          categoryName = cosmos.category?.description ?? null;
        }

        if (!avgPrice && SERPAPI_KEY && state.serpUsed < SERPAPI_MONTHLY_LIMIT) {
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
