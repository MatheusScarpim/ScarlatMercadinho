import axios from 'axios';
import { GtinLookupModel, type GtinLookupDocument } from '../models/GtinLookup';
import { CategoryModel } from '../models/Category';
import { ProductModel } from '../models/Product';

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

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 8000);
const COSMOS_DEBUG = process.env.COSMOS_DEBUG;

type AiProductGuess = {
  ean: string;
  name: string | null;
  description: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  averagePrice: string | null;
};

function sanitizeCategory(code: string | null | undefined, name: string | null | undefined) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const validName = cleanName.length ? cleanName : null;

  // Ignora qualquer codigo vindo da IA; usamos apenas nome
  return { code: null, name: validName };
}

function inferCategoryName(nameHint: string | null | undefined) {
  const text = (nameHint || '').toLowerCase();
  const rules: Array<{ test: RegExp; name: string }> = [
    { test: /(coca|cola|refrigerante|guarana|soda|refri)/, name: 'Refrigerantes' },
    { test: /(cerveja|brew|lager|pilsen)/, name: 'Cervejas' },
    { test: /(agua|mineral)/, name: '�?gua' },
    { test: /(suco|nectar)/, name: 'Sucos' },
    { test: /(vinho)/, name: 'Vinhos' },
    { test: /(carne|bovino|frango|suino)/, name: 'Carnes' },
    { test: /(arroz)/, name: 'Arroz' },
    { test: /(feijao|feijão)/, name: 'Feij�o' },
    { test: /(pao|pão|panetone|pao de forma)/, name: 'Padaria' },
    { test: /(leite|lactic)/, name: 'Latic�nios' },
    { test: /(iogurte)/, name: 'Iogurtes' },
    { test: /(queijo)/, name: 'Queijos' },
    { test: /(sabao|detergente|limpeza)/, name: 'Limpeza' },
    { test: /(sabonete|shampoo|higiene|desodorante|creme dental|escova)/, name: 'Higiene Pessoal' },
    { test: /(cachorro|gato|pet|ração|racao)/, name: 'Pet' },
    { test: /(fruta|banana|ma\w*|laranja|uva|hortifruti|legume|verdura)/, name: 'Hortifruti' },
  ];
  for (const rule of rules) {
    if (rule.test.test(text)) {
      return rule.name;
    }
  }
  return null;
}

function buildMessages(ean: string, nameHint?: string) {
  const system =
    'Voce e um catalogador de produtos brasileiro. Recebe apenas um codigo EAN/GTIN-13 e deve responder estritamente um JSON compacto com os campos: ean, name (nome curto comercial), category_name (apenas nome da categoria, sem codigo), category_code (sempre null) e average_price_brl (preco medio de venda no Brasil em reais). Use null quando nao tiver certeza. Nao inclua texto explicativo. Prefira categorias GENERICAS do varejo brasileiro (refrigerantes, cervejas, sucos, agua, laticinios, carnes, hortifruti, limpeza, higiene pessoal, bazar, pet, etc.). Para produtos de agua (H2O), use o valor mais caro que ja observou como preco medio.';
  const userLines = [`EAN: ${ean}`];
  if (nameHint) {
    userLines.push(`Nome NFCe: ${nameHint}`);
  }
  const user = userLines.join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function fetchProductFromOpenAi(ean: string, nameHint?: string): Promise<AiProductGuess> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY nao configurada');
  }

  const url = `${OPENAI_BASE_URL}/chat/completions`;

  const started = Date.now();
  if (COSMOS_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[COSMOS][OPENAI] request', { url, model: OPENAI_MODEL, ean, nameHint });
  }

  try {
    const { data } = await axios.post(
      url,
      {
        model: OPENAI_MODEL,
        messages: buildMessages(ean, nameHint),
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

    if (COSMOS_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[COSMOS][OPENAI] response', {
        ms: Date.now() - started,
        id: data?.id,
        finish_reason: data?.choices?.[0]?.finish_reason,
        content: data?.choices?.[0]?.message?.content,
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Resposta vazia da OpenAI');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // eslint-disable-next-line no-console
      console.error('[COSMOS] erro ao parsear resposta da OpenAI', content);
      throw new Error('Resposta invalida da OpenAI (nao e JSON)');
    }

    const { name: safeCategoryName } = sanitizeCategory(
      parsed.category_code ??
        parsed.categoryCode ??
        parsed.global_product_category_code ??
        parsed.globalProductCategory ??
        null,
      parsed.category_name ??
        parsed.categoryName ??
        parsed.global_product_category_name ??
        parsed.globalProductCategoryName ??
        null,
    );

    const inferred = inferCategoryName(nameHint || parsed.name || parsed.description || '');
    const finalCategoryName = (safeCategoryName ?? inferred ?? null)?.toUpperCase() || null;

    return {
      ean: parsed.ean ?? ean,
      name: parsed.name ?? null,
      description: parsed.description ?? parsed.name ?? null,
      categoryCode: null,
      categoryName: finalCategoryName,
      averagePrice:
        parsed.average_price_brl ??
        parsed.averagePrice ??
        parsed.average_price ??
        parsed.price ??
        parsed.preco_medio ??
        null,
    };
  } catch (err: any) {
    if (COSMOS_DEBUG) {
      // eslint-disable-next-line no-console
      console.error('[COSMOS][OPENAI] error', {
        ms: Date.now() - started,
        status: err?.response?.status,
        message: err?.response?.data?.error?.message || err?.message,
        data: err?.response?.data,
      });
    }
    const details =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      'Erro ao consultar OpenAI';
    throw new Error(details);
  }
}


async function ensureCategory(name: string | null) {
  if (!name) return { name: null, id: null };

  const normalized = name.toUpperCase();

  const existing = await CategoryModel.findOne({ name: normalized }).lean();
  if (existing) return { name: existing.name, id: existing._id?.toString?.() ?? null };

  const created = await CategoryModel.create({ name: normalized, active: true });
  return { name: created.name, id: created._id?.toString?.() ?? null };
}

async function ensureProductFromAi(params: {
  ean: string;
  name: string | null;
  description: string | null;
  categoryId: string | null;
  averagePrice: string | null;
  imageUrl?: string | null;
}) {
  const { ean, name, description, categoryId, averagePrice, imageUrl } = params;
  const existing = await ProductModel.findOne({ barcode: ean });
  if (existing) {
    const safeImage = imageUrl || existing.imageUrl || `https://cdn-cosmos.bluesoft.com.br/products/${ean}`;
    if (safeImage && existing.imageUrl !== safeImage) {
      existing.imageUrl = safeImage;
      await existing.save();
    }
    return existing._id.toString();
  }

  const sale = Number(averagePrice ?? '');
  const salePrice = Number.isFinite(sale) && sale > 0 ? sale : 0;
  const safeImage = imageUrl || `https://cdn-cosmos.bluesoft.com.br/products/${ean}`;

  const created = await ProductModel.create({
    name: name || description || 'Produto sem nome',
    description: description || name,
    barcode: ean,
    category: categoryId,
    imageUrl: safeImage,
    costPrice: 0,
    salePrice,
    stockQuantity: 0,
    stockByLocation: [],
    minimumStock: 0,
    active: true,
    isWeighed: false,
  });

  return created._id.toString();
}

async function fetchAndCache(ean: string, nameHint?: string): Promise<GtinLookupDocument> {
  const aiResult = await fetchProductFromOpenAi(ean, nameHint);

  const globalProductCategory = aiResult.categoryName ?? aiResult.categoryCode ?? null;
  const ensuredCategory = await ensureCategory(globalProductCategory);
  const productId = await ensureProductFromAi({
    ean: aiResult.ean,
    name: aiResult.name,
    description: aiResult.description,
    categoryId: ensuredCategory.id,
    averagePrice: aiResult.averagePrice,
    imageUrl: aiResult.averagePrice ? `https://cdn-cosmos.bluesoft.com.br/products/${aiResult.ean}` : null,
  });

  const created = await GtinLookupModel.create({
    ean: aiResult.ean,
    name: aiResult.name,
    description: aiResult.description ?? aiResult.name,
    globalProductCategory: ensuredCategory.name ?? globalProductCategory,
    categoryId: ensuredCategory.id ?? null,
    categoryName: ensuredCategory.name ?? globalProductCategory,
    imageUrl: `https://cdn-cosmos.bluesoft.com.br/products/${aiResult.ean}`,
    averagePrice: aiResult.averagePrice,
    sourceUrl: 'openai',
  });

  return created;
}

export async function fetchCosmosProduct(ean: string, nameHint?: string): Promise<CosmosProduct> {
  const existing = await GtinLookupModel.findOne({ ean }).lean<GtinLookupDocument | null>();
  if (existing) {
    const ensuredCategory = await ensureCategory(existing.globalProductCategory ?? null);
    await ensureProductFromAi({
      ean,
      name: existing.name,
      description: existing.description,
      categoryId: ensuredCategory.id,
      averagePrice: existing.averagePrice,
      imageUrl: existing.imageUrl || `https://cdn-cosmos.bluesoft.com.br/products/${ean}`,
    });

    return {
      ean: existing.ean,
      name: existing.name ?? null,
      description: existing.description ?? existing.name ?? null,
      averagePrice: existing.averagePrice ?? null,
      imageUrl: existing.imageUrl ?? `https://cdn-cosmos.bluesoft.com.br/products/${ean}`,
      globalProductCategory: existing.globalProductCategory ?? existing.categoryName ?? null,
      categoryCode: null,
      categoryName: existing.categoryName ?? existing.globalProductCategory ?? null,
      url: existing.sourceUrl ?? 'openai',
    };
  }

  const created = await fetchAndCache(ean, nameHint);

  return {
    ean: created.ean,
    name: created.name ?? null,
    description: created.description ?? created.name ?? null,
    averagePrice: created.averagePrice ?? null,
    imageUrl: created.imageUrl ?? `https://cdn-cosmos.bluesoft.com.br/products/${ean}`,
    globalProductCategory: created.globalProductCategory ?? created.categoryName ?? null,
    categoryCode: null,
    categoryName: created.categoryName ?? created.globalProductCategory ?? null,
    url: created.sourceUrl ?? 'openai',
  };
}
