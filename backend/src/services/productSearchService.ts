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

    // Bloqueia CSS/fontes pra carregar mais rápido
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'stylesheet' || type === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(`${PRODUCT_SEARCH_URL}/?q=${ean}`, {
      waitUntil: 'networkidle2',
      timeout: SCRAPE_TIMEOUT_MS,
    });

    // Debug: loga o título e um trecho do HTML
    const debugInfo = await page.evaluate(() => ({
      title: document.title,
      bodySnippet: document.body?.innerHTML?.substring(0, 2000) || '',
    }));
    console.log('[PRODUCT-SEARCH] Página título:', debugInfo.title);
    console.log('[PRODUCT-SEARCH] HTML snippet:', debugInfo.bodySnippet.substring(0, 500));

    const result = await page.evaluate(() => {
      // 1. Nome do título: "EAN 7898422746759 Sabonete Dove Cremoso 90g"
      const title = document.title || '';
      const nameMatch = title.match(/^EAN\s+\d+\s+(.+)$/);
      const nameFromTitle = nameMatch ? nameMatch[1].trim() : null;

      // 2. Nome de headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5');
      let nameFromHeading: string | null = null;
      for (const h of headings) {
        const text = h.textContent?.trim() || '';
        if (text.length > 3 && !text.match(/^EAN\s*$/i) && !text.match(/product.search/i)) {
          nameFromHeading = text;
          break;
        }
      }

      // 3. Imagem — tenta vários seletores
      const imgSelectors = [
        'img[src*="product"]',
        'img[src*="gtin"]',
        'img[src*="ean"]',
        'img.product-image',
        '.product img',
        '.panel-body img',
        '.thumbnail img',
        'article img',
        'main img',
        '.container img',
      ];
      let imageUrl: string | null = null;
      for (const sel of imgSelectors) {
        const el = document.querySelector(sel) as HTMLImageElement;
        if (el?.src && !el.src.includes('logo') && !el.src.includes('favicon') && !el.src.includes('icon')) {
          imageUrl = el.src;
          break;
        }
      }
      // Fallback: qualquer img que não seja logo/icon
      if (!imageUrl) {
        const allImgs = document.querySelectorAll('img');
        for (const img of allImgs) {
          const src = (img as HTMLImageElement).src || '';
          if (src && !src.includes('logo') && !src.includes('favicon') && !src.includes('icon') && !src.includes('product-search.png')) {
            imageUrl = src;
            break;
          }
        }
      }

      // 4. Descrição
      const desc = document.querySelector('.product-description, .description, p.lead, .panel-body p');
      const description = desc?.textContent?.trim() || null;

      return {
        name: nameFromTitle || nameFromHeading,
        imageUrl,
        description,
      };
    });

    console.log('[PRODUCT-SEARCH] Resultado para EAN:', ean, JSON.stringify(result));
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
