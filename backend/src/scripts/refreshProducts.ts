/**
 * Script para atualizar produtos via Cosmos API + SerpAPI.
 *
 * Controle: GtinLookup.refreshedAt
 *   - null  → nunca processado pelo Cosmos real → precisa processar
 *   - data  → já foi processado → pula
 *
 * LIMITES:
 *   - Cosmos API: 25 requests/dia
 *   - SerpAPI: 250 requests/mês (só quando Cosmos não tem preço)
 *
 * Uso:
 *   npm run refresh-products          (processa pendentes)
 *   npm run refresh-products -- --all (força reprocessar tudo)
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import axios from 'axios';
import { ProductModel } from '../models/Product';
import { GtinLookupModel } from '../models/GtinLookup';
import { CategoryModel } from '../models/Category';

// ── Config ──────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || '';
const COSMOS_API_TOKEN = process.env.COSMOS_API_TOKEN || '';
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const DELAY_MS = Number(process.env.REFRESH_DELAY_MS ?? 1000);
const COSMOS_DAILY_LIMIT = Number(process.env.COSMOS_DAILY_LIMIT ?? 25);
const SERPAPI_MONTHLY_LIMIT = Number(process.env.SERPAPI_MONTHLY_LIMIT ?? 250);
const FORCE_ALL = process.argv.includes('--all');

let cosmosUsed = 0;
let serpUsed = 0;

// ── Cosmos API ──────────────────────────────────────────────────────
async function fetchCosmos(ean: string) {
  if (!COSMOS_API_TOKEN || cosmosUsed >= COSMOS_DAILY_LIMIT) return null;
  try {
    cosmosUsed++;
    const { data } = await axios.get(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      {
        timeout: 10000,
        headers: { 'X-Cosmos-Token': COSMOS_API_TOKEN, 'User-Agent': 'ScarlatMercadinho/1.0' },
      },
    );
    return data;
  } catch (err: any) {
    if (err?.response?.status === 429) {
      console.warn('  ⚠ Cosmos rate-limit atingido!');
      cosmosUsed = COSMOS_DAILY_LIMIT;
    }
    return null;
  }
}

// ── Sanitiza preços Cosmos (max/avg inclui caixa/atacado) ────────────
function sanitizePrices(p: { min: number | null; avg: number | null; max: number | null }) {
  let { min, avg, max } = p;
  if (min && avg && avg > min * 2) { avg = Math.round(min * 1.3 * 100) / 100; }
  if (max && avg && max > avg * 1.5) { max = Math.round(avg * 1.4 * 100) / 100; }
  return { min, avg, max };
}

// ── Filtro de outliers (clustering) ──────────────────────────────────
function removeOutliers(raw: number[]): number[] {
  if (raw.length < 2) return raw;
  const sorted = [...raw].sort((a, b) => a - b);

  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] > sorted[i - 1] * 2) {
      clusters.push([sorted[i]]);
    } else {
      clusters[clusters.length - 1].push(sorted[i]);
    }
  }

  const biggest = clusters.reduce((a, b) => (a.length >= b.length ? a : b));

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

// ── SerpAPI ─────────────────────────────────────────────────────────
async function fetchSerpPrices(productName: string) {
  if (!SERPAPI_KEY || serpUsed >= SERPAPI_MONTHLY_LIMIT) return null;
  try {
    serpUsed++;
    const { data } = await axios.get('https://serpapi.com/search.json', {
      params: { engine: 'google_shopping', q: productName, gl: 'br', hl: 'pt', api_key: SERPAPI_KEY },
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
  } catch {
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────
async function ensureCategory(name: string | null) {
  const normalized = (name || 'OUTROS').toUpperCase();
  const existing = await CategoryModel.findOne({ name: normalized }).lean();
  if (existing) return existing._id?.toString() ?? null;
  const created = await CategoryModel.create({ name: normalized, active: true });
  return created._id?.toString() ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  if (!MONGO_URI) { console.error('MONGODB_URI não configurado!'); process.exit(1); }
  if (!COSMOS_API_TOKEN) { console.error('COSMOS_API_TOKEN não configurado!'); process.exit(1); }

  await mongoose.connect(MONGO_URI);
  console.log('MongoDB conectado\n');

  // Buscar todos os produtos
  const allProducts = await ProductModel.find({}).lean();

  // Buscar EANs já processados (refreshedAt != null)
  const processedLookups = FORCE_ALL
    ? []
    : await GtinLookupModel.find({ refreshedAt: { $ne: null } }).select('ean').lean();
  const processedEans = new Set(processedLookups.map((l) => l.ean));

  // Separar pendentes vs já processados
  const pendentes = allProducts.filter((p) => p.barcode && !processedEans.has(p.barcode));
  const jaProcessados = allProducts.length - pendentes.length;

  console.log(`Total de produtos:   ${allProducts.length}`);
  console.log(`Já processados:      ${jaProcessados}`);
  console.log(`Pendentes:           ${pendentes.length}`);
  if (FORCE_ALL) console.log(`(--all: reprocessando todos)`);
  console.log(`\nLimites: Cosmos ${COSMOS_DAILY_LIMIT}/dia | SerpAPI ${SERPAPI_KEY ? `${SERPAPI_MONTHLY_LIMIT}/mês` : 'não configurado'}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (!pendentes.length) {
    console.log('Todos os produtos já foram processados!');
    await mongoose.disconnect();
    process.exit(0);
  }

  let updated = 0;
  let noChanges = 0;
  let failed = 0;

  for (let i = 0; i < pendentes.length; i++) {
    if (cosmosUsed >= COSMOS_DAILY_LIMIT) {
      const restantes = pendentes.length - i;
      const dias = Math.ceil(restantes / COSMOS_DAILY_LIMIT);
      console.log(`\n⏸ Limite diário do Cosmos (${COSMOS_DAILY_LIMIT}). Restam ${restantes} produtos (~${dias} dias).`);
      console.log(`  Rode novamente amanhã.`);
      break;
    }

    const product = pendentes[i];
    const ean = product.barcode;
    const label = `[${i + 1}/${pendentes.length}] ${ean} - ${(product.name || '?').substring(0, 40)}`;

    try {
      console.log(`${label}`);
      console.log(`  Cosmos (${cosmosUsed + 1}/${COSMOS_DAILY_LIMIT})...`);
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
        console.log(`  Cosmos: ${cosmosName ?? '?'} | avg=${avgPrice ?? '-'} min=${minPrice ?? '-'} max=${maxPrice ?? '-'} (raw: avg=${rawAvg} min=${rawMin} max=${rawMax})`);
      } else {
        console.log(`  Cosmos: não encontrado`);
      }

      // SerpAPI se Cosmos não tem preço
      if (!avgPrice && SERPAPI_KEY && serpUsed < SERPAPI_MONTHLY_LIMIT) {
        console.log(`  SerpAPI (${serpUsed + 1}/${SERPAPI_MONTHLY_LIMIT})...`);
        const serp = await fetchSerpPrices(product.name || ean);
        if (serp) {
          minPrice = minPrice ?? serp.min;
          avgPrice = serp.avg;
          maxPrice = maxPrice ?? serp.max;
          priceSource = 'serpapi';
          console.log(`  SerpAPI: avg=${serp.avg} min=${serp.min} max=${serp.max}`);
        } else {
          console.log(`  SerpAPI: sem resultados`);
        }
      }

      // ── Atualizar Product ──
      const productUpdate: any = {};
      if (minPrice !== null) productUpdate.minPrice = minPrice;
      if (avgPrice !== null) productUpdate.avgPrice = avgPrice;
      if (maxPrice !== null) productUpdate.maxPrice = maxPrice;
      if (ncm && !product.ncm) productUpdate.ncm = ncm;
      if (imageUrl) productUpdate.imageUrl = imageUrl;

      // Categoria
      if (categoryName) {
        const currentCat = await CategoryModel.findById(product.category).lean();
        if (!currentCat || currentCat.name === 'OUTROS') {
          const newCatId = await ensureCategory(categoryName);
          if (newCatId) productUpdate.category = newCatId;
        }
      }

      if (Object.keys(productUpdate).length > 0) {
        await ProductModel.updateOne({ _id: product._id }, { $set: productUpdate });
        updated++;
      } else {
        noChanges++;
      }

      // ── Atualizar/Criar GtinLookup (controle) ──
      const finalName = cosmosName || product.name || null;
      const finalCategory = categoryName?.toUpperCase() ?? null;
      const catId = productUpdate.category ?? product.category?.toString() ?? null;

      await GtinLookupModel.updateOne(
        { ean },
        {
          $set: {
            name: finalName,
            description: finalName,
            globalProductCategory: finalCategory,
            categoryId: catId,
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

      const status = Object.keys(productUpdate).length > 0 ? 'ATUALIZADO' : 'SEM ALTERAÇÕES (lookup marcado)';
      console.log(`  → ${status}\n`);
    } catch (err: any) {
      console.error(`  → ERRO: ${err?.message}\n`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  // ── Resumo ──
  console.log(`${'─'.repeat(60)}`);
  console.log(`RESULTADO`);
  console.log(`  Atualizados:    ${updated}`);
  console.log(`  Sem alteração:  ${noChanges}`);
  console.log(`  Erros:          ${failed}`);
  console.log(`  Cosmos usados:  ${cosmosUsed}/${COSMOS_DAILY_LIMIT}`);
  console.log(`  SerpAPI usados: ${serpUsed}/${SERPAPI_MONTHLY_LIMIT}`);

  const totalProcessados = jaProcessados + updated + noChanges + failed;
  const restantes = allProducts.length - totalProcessados;
  if (restantes > 0) {
    const dias = Math.ceil(restantes / COSMOS_DAILY_LIMIT);
    console.log(`\n  Pendentes: ${restantes} (~${dias} dias pra completar)`);
  } else {
    console.log(`\n  Todos os produtos processados!`);
  }

  console.log(`${'─'.repeat(60)}\n`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
