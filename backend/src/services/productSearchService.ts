import puppeteer, { type Browser } from 'puppeteer';

const PRODUCT_SEARCH_URL = 'https://pt.product-search.net';
const SCRAPE_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 15000);

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  return browserInstance;
}

export async function scrapeProductName(ean: string): Promise<string | null> {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Bloqueia CSS/fontes/imagens pra carregar mais rápido (só precisa do HTML)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'stylesheet' || type === 'font' || type === 'image') {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(`${PRODUCT_SEARCH_URL}/?q=${ean}`, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPE_TIMEOUT_MS,
    });

    // Nome vem do título: "EAN 7898422746759 Sabonete Dove Cremoso 90g"
    const title = await page.title();
    const match = title.match(/^EAN\s+\d+\s+(.+)$/);
    const name = match ? match[1].trim() : null;

    console.log('[PRODUCT-SEARCH] EAN:', ean, '| Nome:', name);
    return name;
  } catch (err: any) {
    console.error('[PRODUCT-SEARCH] Erro ao buscar nome:', err?.message);
    return null;
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
}

process.on('exit', () => {
  if (browserInstance) browserInstance.close().catch(() => {});
});

process.on('SIGINT', () => {
  if (browserInstance) browserInstance.close().catch(() => {});
});
