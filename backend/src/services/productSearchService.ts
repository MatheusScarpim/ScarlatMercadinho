import puppeteer, { type Browser } from 'puppeteer';

const PRODUCT_SEARCH_URL = 'https://pt.product-search.net';
const SCRAPE_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 10000);

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

export interface ProductSearchResult {
  name: string | null;
  imageUrl: string | null;
  description: string | null;
}

export async function scrapeProductByEan(ean: string): Promise<ProductSearchResult | null> {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    await page.goto(`${PRODUCT_SEARCH_URL}/?q=${ean}`, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPE_TIMEOUT_MS,
    });

    const result = await page.evaluate(() => {
      // Tenta pegar o nome do produto do título da página
      const title = document.title || '';
      // Formato: "EAN 7898422746759 Sabonete Dove Cremoso 90g"
      const nameMatch = title.match(/^EAN\s+\d+\s+(.+)$/);
      const nameFromTitle = nameMatch ? nameMatch[1].trim() : null;

      // Tenta pegar do H4 ou heading do produto
      const h4 = document.querySelector('h4');
      const nameFromH4 = h4?.textContent?.trim() || null;

      // Tenta pegar a imagem do produto
      const img = document.querySelector('img[src*="product"], img[src*="gtin"], img.product-image, .product img, img[alt*="EAN"]');
      const imgGeneric = document.querySelector('article img, .panel img, .thumbnail img, main img');
      const imageUrl = (img as HTMLImageElement)?.src || (imgGeneric as HTMLImageElement)?.src || null;

      // Tenta pegar descrição
      const desc = document.querySelector('.product-description, .description, p.lead');
      const description = desc?.textContent?.trim() || null;

      return {
        name: nameFromTitle || nameFromH4,
        imageUrl,
        description,
      };
    });

    console.log('[PRODUCT-SEARCH] Scrape resultado para EAN:', ean, result);
    return result;
  } catch (err: any) {
    console.error('[PRODUCT-SEARCH] Erro ao scrape:', err?.message);
    return null;
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
}

// Fecha o browser quando o processo encerrar
process.on('exit', () => {
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});

process.on('SIGINT', () => {
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});
