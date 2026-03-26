import axios from 'axios';
import { GtinLookupModel, type GtinLookupDocument } from '../models/GtinLookup';
import { CategoryModel } from '../models/Category';
import { ProductModel } from '../models/Product';

// ── Config (multi-key) ──────────────────────────────────────────────
function parseKeys(envVar: string): string[] {
  const val = process.env[envVar] || '';
  return val.split(',').map((k) => k.trim()).filter(Boolean);
}

const COSMOS_TOKENS = parseKeys('COSMOS_API_TOKEN');
const SERPAPI_KEYS = parseKeys('SERPAPI_KEY');
const COSMOS_API_TIMEOUT = Number(process.env.COSMOS_API_TIMEOUT_MS ?? 10000);
const SERPAPI_TIMEOUT = Number(process.env.SERPAPI_TIMEOUT_MS ?? 12000);

// Round-robin simples para distribuir entre keys
let cosmosKeyIndex = 0;
let serpKeyIndex = 0;

function nextCosmosToken(): string | null {
  if (!COSMOS_TOKENS.length) return null;
  const token = COSMOS_TOKENS[cosmosKeyIndex % COSMOS_TOKENS.length];
  cosmosKeyIndex++;
  return token;
}

function nextSerpKey(): string | null {
  if (!SERPAPI_KEYS.length) return null;
  const key = SERPAPI_KEYS[serpKeyIndex % SERPAPI_KEYS.length];
  serpKeyIndex++;
  return key;
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 15000);

// ── Types ───────────────────────────────────────────────────────────
export interface CosmosProduct {
  ean: string;
  name: string | null;
  description: string | null;
  averagePrice: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  imageUrl: string | null;
  globalProductCategory?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  ncm?: string | null;
  brand?: string | null;
  gpcDescription?: string | null;
  url: string;
}

interface PriceInfo {
  min: number | null;
  avg: number | null;
  max: number | null;
}

interface CosmosApiResponse {
  description: string | null;
  gtin: number;
  thumbnail: string | null;
  price: number | null;
  avg_price: number | null;
  max_price: number | null;
  min_price: number | null;
  brand?: { name: string; picture?: string } | null;
  gpc?: { code: string; description: string } | null;
  ncm?: { code: string; description: string; full_description?: string } | null;
  category?: { id: number; description: string; parent_id?: number } | null;
  net_weight: number | null;
  gross_weight: number | null;
}

type AiProductGuess = {
  ean: string;
  name: string | null;
  description: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  averagePrice: string | null;
};

// ── 1. COSMOS API REAL ──────────────────────────────────────────────
async function fetchFromCosmosApi(ean: string): Promise<CosmosApiResponse | null> {
  const token = nextCosmosToken();
  if (!token) {
    console.warn('[COSMOS-API] Nenhum token configurado (COSMOS_API_TOKEN)');
    return null;
  }

  try {
    console.log('[COSMOS-API] Buscando EAN:', ean);
    const { data } = await axios.get<CosmosApiResponse>(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      {
        timeout: COSMOS_API_TIMEOUT,
        headers: {
          'X-Cosmos-Token': token,
          'User-Agent': 'ScarlatMercadinho/1.0',
        },
      },
    );

    console.log('[COSMOS-API] Resultado:', {
      description: data.description,
      avg_price: data.avg_price,
      max_price: data.max_price,
      brand: data.brand?.name,
      category: data.category?.description,
      ncm: data.ncm?.code,
      gpc: data.gpc?.description,
    });

    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      console.log('[COSMOS-API] Produto não encontrado no Cosmos:', ean);
    } else if (err?.response?.status === 401 || err?.response?.status === 403) {
      console.warn('[COSMOS-API] Token inválido ou expirado');
    } else {
      console.warn('[COSMOS-API] Erro:', err?.message);
    }
    return null;
  }
}

/**
 * Sanitiza preços — Cosmos retorna max/avg de caixa/atacado.
 * No varejo unitário, min é o preço mais confiável.
 */
function sanitizePrices(p: PriceInfo): PriceInfo {
  let { min, avg, max } = p;

  if (max && avg && max > avg * 2) {
    max = Math.round(avg * 1.5 * 100) / 100;
  }

  if (min && avg && min < avg * 0.3) {
    min = Math.round(avg * 0.7 * 100) / 100;
  }

  return { min, avg, max };
}

function extractCosmosPrices(data: CosmosApiResponse): PriceInfo {
  const min = data.min_price && data.min_price > 0 ? data.min_price : null;
  const avg = data.avg_price && data.avg_price > 0 ? data.avg_price : null;
  const max = data.max_price && data.max_price > 0 ? data.max_price : null;
  const fallbackAvg = data.price && data.price > 0 ? data.price : null;
  const raw: PriceInfo = { min, avg: avg ?? fallbackAvg, max };
  return sanitizePrices(raw);
}

function hasSomePrice(p: PriceInfo): boolean {
  return p.avg !== null || p.min !== null || p.max !== null;
}

// ── 2. SERPAPI GOOGLE SHOPPING (fallback de preço) ──────────────────

/**
 * Remove outliers de preço (kits, caixas, atacado, importados).
 *
 * Lógica: pega o cluster de preços mais denso (próximos entre si).
 * Ex: [3.50, 4.00, 4.50, 5.00, 45.00, 85.00, 233.00]
 *   → cluster denso = [3.50, 4.00, 4.50, 5.00]
 *   → descarta 45, 85, 233 (saltos grandes)
 */
function removeOutliers(raw: number[]): number[] {
  if (raw.length < 2) return raw;
  const sorted = [...raw].sort((a, b) => a - b);

  // Passo 1: agrupar preços próximos (gap máximo de 2x entre vizinhos)
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // Se o preço atual é mais que 2x o anterior, novo cluster
    if (curr > prev * 2) {
      clusters.push([curr]);
    } else {
      clusters[clusters.length - 1].push(curr);
    }
  }

  // Passo 2: pegar o cluster com mais itens (preço unitário real)
  const biggest = clusters.reduce((a, b) => (a.length >= b.length ? a : b));

  // Passo 3: se sobrou só 1 cluster, aplicar IQR como refinamento
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

async function fetchPriceFromSerpApi(productName: string): Promise<PriceInfo | null> {
  const apiKey = nextSerpKey();
  if (!apiKey) {
    console.warn('[SERPAPI] Nenhuma chave configurada (SERPAPI_KEY)');
    return null;
  }

  try {
    console.log('[SERPAPI] Buscando preço para:', productName);
    const { data } = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_shopping',
        q: productName,
        gl: 'br',
        hl: 'pt',
        api_key: apiKey,
      },
      timeout: SERPAPI_TIMEOUT,
    });

    const results = data.shopping_results || [];
    if (!results.length) {
      console.log('[SERPAPI] Nenhum resultado encontrado');
      return null;
    }

    const raw: number[] = results
      .map((r: any) => parseFloat(r.extracted_price))
      .filter((p: number) => !isNaN(p) && p > 0);

    if (!raw.length) {
      console.log('[SERPAPI] Resultados sem preço extraível');
      return null;
    }

    const prices = removeOutliers(raw);
    prices.sort((a, b) => a - b);
    const min = Math.round(prices[0] * 100) / 100;
    const max = Math.round(prices[prices.length - 1] * 100) / 100;
    const avg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

    console.log('[SERPAPI] Preços (após filtro outliers):', { min, avg, max, total: prices.length, descartados: raw.length - prices.length });
    return { min, avg, max };
  } catch (err: any) {
    console.warn('[SERPAPI] Erro:', err?.message);
    return null;
  }
}

// ── 3. OPENAI (último fallback) ─────────────────────────────────────
function buildMessages(ean: string, nameHint?: string) {
  const system =
    'Voce e um catalogador de produtos brasileiro. Recebe apenas um codigo EAN/GTIN-13 e deve responder estritamente um JSON compacto com os campos: ean, name (nome curto comercial), category_name (apenas nome da categoria, sem codigo), category_code (sempre null) e average_price_brl (preco de venda mais alto que voce ja observou no varejo brasileiro em reais). IMPORTANTE: o preco NUNCA pode ser null ou zero — sempre retorne o valor mais alto que conhecer para esse produto. Se nao souber o preco exato, estime com base em produtos similares usando o valor mais alto da faixa. Nao inclua texto explicativo. Prefira categorias GENERICAS do varejo brasileiro (refrigerantes, cervejas, sucos, agua, laticinios, carnes, hortifruti, limpeza, higiene pessoal, bazar, pet, etc.).';
  const userLines = [`EAN: ${ean}`];
  if (nameHint) {
    userLines.push(`Nome NFCe: ${nameHint}`);
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: userLines.join('\n') },
  ];
}

async function fetchProductFromOpenAi(ean: string, nameHint?: string): Promise<AiProductGuess> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY nao configurada');
  }

  const url = `${OPENAI_BASE_URL}/chat/completions`;
  const messages = buildMessages(ean, nameHint);
  const started = Date.now();
  console.log('[COSMOS][OPENAI] Enviando para IA | EAN:', ean, '| hint:', nameHint ?? '(nenhum)');

  try {
    const { data } = await axios.post(
      url,
      {
        model: OPENAI_MODEL,
        messages,
        temperature: 0,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: OPENAI_TIMEOUT_MS,
      },
    );

    const content = data?.choices?.[0]?.message?.content;
    console.log('[COSMOS][OPENAI] Resposta em', Date.now() - started, 'ms:', content);

    if (!content || typeof content !== 'string') {
      throw new Error('Resposta vazia da OpenAI');
    }

    const parsed = JSON.parse(content);

    const inferred = inferCategoryName(nameHint || parsed.name || parsed.description || '');
    const categoryName = (
      parsed.category_name ?? parsed.categoryName ?? inferred ?? null
    )?.toString().toUpperCase() || null;

    return {
      ean: parsed.ean ?? ean,
      name: parsed.name ?? null,
      description: parsed.description ?? parsed.name ?? null,
      categoryCode: null,
      categoryName,
      averagePrice:
        parsed.average_price_brl ??
        parsed.averagePrice ??
        parsed.average_price ??
        parsed.price ??
        null,
    };
  } catch (err: any) {
    console.error('[COSMOS][OPENAI] ERRO:', err?.response?.data?.error?.message || err?.message);
    throw new Error(err?.response?.data?.error?.message || err?.message || 'Erro OpenAI');
  }
}

// ── Helpers ─────────────────────────────────────────────────────────
function inferCategoryName(nameHint: string | null | undefined) {
  const text = (nameHint || '').toLowerCase();
  const rules: Array<{ test: RegExp; name: string }> = [
    { test: /(coca|cola|refrigerante|guarana|soda|refri)/, name: 'Refrigerantes' },
    { test: /(cerveja|brew|lager|pilsen)/, name: 'Cervejas' },
    { test: /(agua|mineral)/, name: 'Água' },
    { test: /(suco|nectar)/, name: 'Sucos' },
    { test: /(vinho)/, name: 'Vinhos' },
    { test: /(carne|bovino|frango|suino)/, name: 'Carnes' },
    { test: /(arroz)/, name: 'Arroz' },
    { test: /(feijao|feijão)/, name: 'Feijão' },
    { test: /(pao|pão|panetone|pao de forma)/, name: 'Padaria' },
    { test: /(leite|lactic)/, name: 'Laticínios' },
    { test: /(iogurte)/, name: 'Iogurtes' },
    { test: /(queijo)/, name: 'Queijos' },
    { test: /(sabao|detergente|limpeza|desinfetante)/, name: 'Limpeza' },
    { test: /(sabonete|shampoo|higiene|desodorante|creme dental|escova)/, name: 'Higiene Pessoal' },
    { test: /(cachorro|gato|pet|ração|racao)/, name: 'Pet' },
    { test: /(fruta|banana|ma\w*|laranja|uva|hortifruti|legume|verdura)/, name: 'Hortifruti' },
  ];
  for (const rule of rules) {
    if (rule.test.test(text)) return rule.name;
  }
  return null;
}

async function ensureCategory(name: string | null) {
  const normalized = (name || 'OUTROS').toUpperCase();
  const existing = await CategoryModel.findOne({ name: normalized }).lean();
  if (existing) return { name: existing.name, id: existing._id?.toString?.() ?? null };
  const created = await CategoryModel.create({ name: normalized, active: true });
  return { name: created.name, id: created._id?.toString?.() ?? null };
}

async function ensureProduct(params: {
  ean: string;
  name: string | null;
  description: string | null;
  categoryId: string | null;
  averagePrice: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  imageUrl?: string | null;
  ncm?: string | null;
}) {
  const { ean, name, description, categoryId, averagePrice, minPrice, maxPrice, imageUrl, ncm } = params;
  const existing = await ProductModel.findOne({ barcode: ean });
  if (existing) {
    let changed = false;
    if (imageUrl && existing.imageUrl !== imageUrl) {
      existing.imageUrl = imageUrl;
      changed = true;
    }
    if (ncm && !existing.ncm) {
      existing.ncm = ncm;
      changed = true;
    }
    const parsedMin = Number(minPrice);
    const parsedAvg = Number(averagePrice);
    const parsedMax = Number(maxPrice);
    if (Number.isFinite(parsedMin) && parsedMin > 0 && existing.minPrice !== parsedMin) {
      existing.minPrice = parsedMin;
      changed = true;
    }
    if (Number.isFinite(parsedAvg) && parsedAvg > 0 && existing.avgPrice !== parsedAvg) {
      existing.avgPrice = parsedAvg;
      changed = true;
    }
    if (Number.isFinite(parsedMax) && parsedMax > 0 && existing.maxPrice !== parsedMax) {
      existing.maxPrice = parsedMax;
      changed = true;
    }
    if (changed) await existing.save();
    return existing._id.toString();
  }

  const sale = Number(averagePrice ?? '');
  const salePrice = Number.isFinite(sale) && sale > 0 ? sale : 0;
  const minP = Number(minPrice ?? '');
  const maxP = Number(maxPrice ?? '');
  const avgP = Number(averagePrice ?? '');

  const created = await ProductModel.create({
    name: name || description || 'Produto sem nome',
    description: description || name,
    barcode: ean,
    category: categoryId,
    imageUrl: imageUrl || null,
    costPrice: 0,
    salePrice,
    minPrice: Number.isFinite(minP) && minP > 0 ? minP : null,
    avgPrice: Number.isFinite(avgP) && avgP > 0 ? avgP : null,
    maxPrice: Number.isFinite(maxP) && maxP > 0 ? maxP : null,
    stockQuantity: 0,
    stockByLocation: [],
    minimumStock: 0,
    active: true,
    isWeighed: false,
    ncm: ncm || null,
  });

  return created._id.toString();
}

// ── MAIN: fetchAndCache ─────────────────────────────────────────────
async function fetchAndCache(ean: string, nameHint?: string): Promise<GtinLookupDocument> {
  console.log('[COSMOS] ============================================');
  console.log('[COSMOS] INICIANDO AUTO-CADASTRO para EAN:', ean);
  console.log('[COSMOS] ============================================');

  // ── PASSO 1: Cosmos API real ──
  const cosmosData = await fetchFromCosmosApi(ean);

  let name: string | null = cosmosData?.description ?? null;
  let categoryName: string | null = cosmosData?.category?.description?.toUpperCase() ?? null;
  let ncm: string | null = cosmosData?.ncm?.code ?? null;
  let brand: string | null = cosmosData?.brand?.name ?? null;
  let gpcDescription: string | null = cosmosData?.gpc?.description ?? null;
  let imageUrl: string | null = cosmosData?.thumbnail ?? `https://cdn-cosmos.bluesoft.com.br/products/${ean}`;
  let prices: PriceInfo = cosmosData ? extractCosmosPrices(cosmosData) : { min: null, avg: null, max: null };
  let priceSource = hasSomePrice(prices) ? 'cosmos-api' : null;

  console.log('[COSMOS] Cosmos API:', {
    name,
    categoryName,
    ncm,
    brand,
    prices,
  });

  // Se não achou categoria no Cosmos, tenta inferir pelo nome
  if (!categoryName && name) {
    categoryName = inferCategoryName(name)?.toUpperCase() ?? null;
  }

  // ── PASSO 2: Se sem preço → SerpAPI Google Shopping ──
  if (!prices.avg) {
    const searchQuery = name || nameHint || ean;
    console.log('[COSMOS] Sem preço no Cosmos, tentando SerpAPI para:', searchQuery);
    const serpPrices = await fetchPriceFromSerpApi(searchQuery);
    if (serpPrices && serpPrices.avg) {
      prices = {
        min: prices.min ?? serpPrices.min,
        avg: prices.avg ?? serpPrices.avg,
        max: prices.max ?? serpPrices.max,
      };
      priceSource = 'serpapi';
      console.log('[COSMOS] SerpAPI retornou preços:', prices);
    }
  }

  // ── PASSO 3: Se ainda sem preço OU sem nome → OpenAI ──
  if (!prices.avg || !name) {
    console.log('[COSMOS] Fallback OpenAI | sem preço:', !prices.avg, '| sem nome:', !name);
    try {
      const aiResult = await fetchProductFromOpenAi(ean, name || nameHint);

      if (!name) {
        name = aiResult.name;
      }
      if (!categoryName && aiResult.categoryName) {
        categoryName = aiResult.categoryName;
      }
      if (!prices.avg) {
        const aiPrice = Number(aiResult.averagePrice);
        if (Number.isFinite(aiPrice) && aiPrice > 0) {
          prices.avg = aiPrice;
          priceSource = 'openai';
          console.log('[COSMOS] OpenAI retornou preço:', aiPrice);
        }
      }
    } catch (err: any) {
      console.error('[COSMOS] OpenAI indisponivel:', err?.message);
    }
  }

  // ── Validação final ──
  const averagePrice = prices.avg ? String(prices.avg) : null;
  const minPrice = prices.min ? String(prices.min) : null;
  const maxPrice = prices.max ? String(prices.max) : null;

  if (!averagePrice || Number(averagePrice) <= 0) {
    console.warn('[COSMOS] Nenhuma fonte retornou preço para EAN:', ean);
    throw new Error('Preço não disponível para auto-cadastro');
  }

  console.log('[COSMOS] === DECISÃO FINAL ===');
  console.log('[COSMOS] Nome:', name);
  console.log('[COSMOS] Categoria:', categoryName);
  console.log('[COSMOS] NCM:', ncm);
  console.log('[COSMOS] Marca:', brand);
  console.log('[COSMOS] Preços: min=', minPrice, '| avg=', averagePrice, '| max=', maxPrice, '| Fonte:', priceSource);
  console.log('[COSMOS] Imagem:', imageUrl);

  // Garantir categoria
  const ensuredCategory = await ensureCategory(categoryName);

  // Garantir produto
  await ensureProduct({
    ean,
    name,
    description: name,
    categoryId: ensuredCategory.id,
    averagePrice,
    minPrice,
    maxPrice,
    imageUrl,
    ncm,
  });

  // Cache no GtinLookup
  const created = await GtinLookupModel.create({
    ean,
    name,
    description: name,
    globalProductCategory: ensuredCategory.name ?? categoryName,
    categoryId: ensuredCategory.id ?? null,
    categoryName: ensuredCategory.name ?? categoryName,
    imageUrl,
    averagePrice,
    minPrice,
    maxPrice,
    sourceUrl: priceSource ?? 'unknown',
  });

  return created;
}

// ── EXPORT: fetchCosmosProduct ──────────────────────────────────────
export async function fetchCosmosProduct(ean: string, nameHint?: string): Promise<CosmosProduct> {
  // Verifica cache existente
  const existing = await GtinLookupModel.findOne({ ean }).lean<GtinLookupDocument | null>();
  if (existing) {
    const cosmosImage = existing.imageUrl ?? `https://cdn-cosmos.bluesoft.com.br/products/${ean}`;

    const ensuredCategory = await ensureCategory(existing.globalProductCategory ?? null);
    await ensureProduct({
      ean,
      name: existing.name,
      description: existing.description,
      categoryId: ensuredCategory.id,
      averagePrice: existing.averagePrice,
      minPrice: existing.minPrice ?? null,
      maxPrice: existing.maxPrice ?? null,
      imageUrl: cosmosImage,
    });

    return {
      ean: existing.ean,
      name: existing.name ?? null,
      description: existing.description ?? existing.name ?? null,
      averagePrice: existing.averagePrice ?? null,
      minPrice: existing.minPrice ?? null,
      maxPrice: existing.maxPrice ?? null,
      imageUrl: cosmosImage,
      globalProductCategory: existing.globalProductCategory ?? existing.categoryName ?? null,
      categoryCode: null,
      categoryName: existing.categoryName ?? existing.globalProductCategory ?? null,
      url: existing.sourceUrl ?? 'cosmos-api',
    };
  }

  // Busca e cacheia
  const created = await fetchAndCache(ean, nameHint);

  return {
    ean: created.ean,
    name: created.name ?? null,
    description: created.description ?? created.name ?? null,
    averagePrice: created.averagePrice ?? null,
    minPrice: created.minPrice ?? null,
    maxPrice: created.maxPrice ?? null,
    imageUrl: created.imageUrl ?? null,
    globalProductCategory: created.globalProductCategory ?? created.categoryName ?? null,
    categoryCode: null,
    categoryName: created.categoryName ?? created.globalProductCategory ?? null,
    url: created.sourceUrl ?? 'cosmos-api',
  };
}
