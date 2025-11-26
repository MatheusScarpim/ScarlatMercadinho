import gpcs from './gpcs.json';

type RawGpcEntry = { code?: string; title?: string };
type RawGpcJson = {
  list?: RawGpcEntry[];
  [code: string]: any;
};

const RAW_GPC: RawGpcJson = gpcs as RawGpcJson;

const CODE_PATTERN = /^[0-9]{4,10}$/;

const GPC_BY_CODE = new Map<string, { code: string; title: string }>();
const GPC_BY_NAME = new Map<string, { code: string; title: string }>();
const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'e', 'com', 'ou', 'em', 'na', 'no']);

type FuzzyEntry = { code: string; title: string; normalizedTitle: string; tokens: string[] };
const FUZZY_ENTRIES: FuzzyEntry[] = [];

function normalizeCode(raw: string | null | undefined) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value && CODE_PATTERN.test(value) ? value : null;
}

function normalizeText(raw: string | null | undefined) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenize(text: string) {
  return text
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !STOP_WORDS.has(part))
    .map((part) => (part.length > 4 && part.endsWith('s') ? part.slice(0, -1) : part));
}

function registerEntry(code?: string, title?: string) {
  const safeCode = normalizeCode(code);
  const safeTitle = typeof title === 'string' ? title.trim() : '';

  if (!safeCode || !safeTitle) return;

  const normalizedTitle = normalizeText(safeTitle);
  const tokens = tokenize(normalizedTitle);

  const entry = { code: safeCode, title: safeTitle };
  if (!GPC_BY_CODE.has(safeCode)) {
    GPC_BY_CODE.set(safeCode, entry);
  }

  if (normalizedTitle && !GPC_BY_NAME.has(normalizedTitle)) {
    GPC_BY_NAME.set(normalizedTitle, entry);
  }

  if (normalizedTitle && tokens.length) {
    FUZZY_ENTRIES.push({ code: safeCode, title: safeTitle, normalizedTitle, tokens });
  }
}

if (Array.isArray(RAW_GPC.list)) {
  for (const item of RAW_GPC.list) {
    registerEntry(item?.code, item?.title);
  }
}

for (const [code, title] of Object.entries(RAW_GPC)) {
  if (code === 'list') continue;
  registerEntry(code, typeof title === 'string' ? title : undefined);
}

function findByFuzzyName(normalizedName: string) {
  if (!normalizedName) return null;

  const nameTokens = tokenize(normalizedName);
  let best: FuzzyEntry | null = null;
  let bestScore = 0;

  for (const entry of FUZZY_ENTRIES) {
    if (entry.normalizedTitle === normalizedName) {
      return entry;
    }

    let score = 0;

    const minLen = Math.min(normalizedName.length, entry.normalizedTitle.length);
    if (
      minLen >= 4 &&
      (entry.normalizedTitle.includes(normalizedName) || normalizedName.includes(entry.normalizedTitle))
    ) {
      const shorter = Math.min(normalizedName.length, entry.normalizedTitle.length);
      const longer = Math.max(normalizedName.length, entry.normalizedTitle.length);
      score = 1 + shorter / longer;
    } else if (nameTokens.length) {
      const overlap = nameTokens.filter((token) => entry.tokens.includes(token)).length;
      if (
        overlap === 0 ||
        (overlap < 2 && !(overlap && overlap / nameTokens.length >= 0.6 && overlap / entry.tokens.length >= 0.6))
      ) {
        continue;
      }
      const coverage = overlap / nameTokens.length;
      const entryCoverage = overlap / entry.tokens.length;
      score = coverage * 0.7 + entryCoverage * 0.3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore >= 0.5) {
    return best;
  }

  return null;
}

export function resolveGpcCategory(code?: string | null, name?: string | null) {
  const normalizedCode = normalizeCode(code);
  if (normalizedCode && GPC_BY_CODE.has(normalizedCode)) {
    const { title } = GPC_BY_CODE.get(normalizedCode)!;
    return { code: normalizedCode, name: title };
  }

  const normalizedName = normalizeText(name);
  if (normalizedName && GPC_BY_NAME.has(normalizedName)) {
    const { code: foundCode, title } = GPC_BY_NAME.get(normalizedName)!;
    return { code: foundCode, name: title };
  }

  const fuzzyMatch = findByFuzzyName(normalizedName);
  if (fuzzyMatch) {
    return { code: fuzzyMatch.code, name: fuzzyMatch.title };
  }

  return { code: null, name: null };
}
