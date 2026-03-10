import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

type Nullable<T> = T | null;

const nfceDebug = process.env.NFCE_DEBUG === '1';
const logDebug = (...args: unknown[]) => {
  if (nfceDebug) {
    // eslint-disable-next-line no-console
    console.log('[NFCE]', ...args);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function saveDebugHtml(source: 'puppeteer' | 'axios', html: string) {
  if (!nfceDebug || !html) return;
  const dir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `nfce-${source}-${Date.now()}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  logDebug(`HTML salvo em ${filePath}`);
}

export interface NfceItem {
  descricao: string;
  codigo: string | null;
  quantidade: Nullable<number>;
  unidade: string | null;
  valorUnitario: Nullable<number>;
  valorTotal: Nullable<number>;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  eanComercial: string | null;
  icms: {
    baseCalculo: Nullable<number>;
    aliquota: Nullable<number>;
    valor: Nullable<number>;
    cst?: string | null;
    csosn?: string | null;
    icmsStRetido?: Nullable<number>;
    fcpStRetido?: Nullable<number>;
    icmsEfetivo?: Nullable<number>;
  };
  pis: {
    baseCalculo: Nullable<number>;
    aliquota: Nullable<number>;
    valor: Nullable<number>;
    cst?: string | null;
  };
  cofins: {
    baseCalculo: Nullable<number>;
    aliquota: Nullable<number>;
    valor: Nullable<number>;
    cst?: string | null;
  };
  valorAproxTributos?: Nullable<number>;
}

export interface NfcePagamento {
  forma: string | null;
  valorPago: Nullable<number>;
  troco: Nullable<number>;
}

export interface NfceTotais {
  quantidadeItens: Nullable<number>;
  valorTotal: Nullable<number>;
  desconto: Nullable<number>;
  valorAPagar: Nullable<number>;
  tributos: Nullable<number>;
  pagamento: NfcePagamento;
}

export interface NfceEmitente {
  nome: string | null;
  cnpj: string | null;
  endereco: string | null;
}

export interface NfceInfo {
  numero: string | null;
  serie: string | null;
  emissao: string | null;
  protocolo: string | null;
  ambiente: string | null;
  versaoXml: string | null;
  versaoXslt: string | null;
}

export interface NfceConsumidor {
  cpf: string | null;
  nome: string | null;
}

export interface NfceData {
  emitente: NfceEmitente;
  itens: NfceItem[];
  totais: NfceTotais;
  info: NfceInfo;
  chaveAcesso: string | null;
  chaveAcessoNumerica: string | null;
  consumidor: NfceConsumidor;
}

const normalizeText = (text: string | undefined | null): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

const normalizeLabel = (text: string | undefined | null): string =>
  normalizeText(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseDecimal = (text: string | undefined | null): Nullable<number> => {
  if (!text) return null;
  const cleaned = text.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
};

function extractEmitente($: cheerio.CheerioAPI): NfceEmitente {
  const nome = normalizeText($('#u20').first().text());
  const textBlocks = $('.txtCenter .text')
    .map((_i, el) => normalizeText($(el).text()))
    .get();
  const cnpjBlock = textBlocks.find((t) => t.toLowerCase().includes('cnpj'));
  const enderecoBlock = textBlocks.find((t) => !t.toLowerCase().includes('cnpj'));

  const cnpj = cnpjBlock ? cnpjBlock.replace(/[^0-9/.-]/g, '').trim() || null : null;
  const endereco = enderecoBlock || null;

  return { nome: nome || null, cnpj, endereco };
}

function extractItens($: cheerio.CheerioAPI): NfceItem[] {
  const itens: NfceItem[] = [];

  $('#tabResult tr').each((_i, el) => {
    const row = $(el);
    const descricao = normalizeText(row.find('.txtTit').text());
    if (!descricao) return;

    const codigoRaw = normalizeText(row.find('.RCod').text());
    const codigoMatch = codigoRaw.match(/(\d[\d.]*)/);
    const unidade = normalizeText(row.find('.RUN').text()).replace(/^UN:\s*/i, '') || null;

    itens.push({
      descricao,
      codigo: codigoMatch ? codigoMatch[1] : null,
      quantidade: parseDecimal(row.find('.Rqtd').text()),
      unidade,
      valorUnitario: parseDecimal(row.find('.RvlUnit').text()),
      valorTotal: parseDecimal(row.find('.valor').text()),
      ncm: null,
      cest: null,
      cfop: null,
      eanComercial: null,
      icms: { baseCalculo: null, aliquota: null, valor: null, cst: null, csosn: null },
      pis: { baseCalculo: null, aliquota: null, valor: null, cst: null },
      cofins: { baseCalculo: null, aliquota: null, valor: null, cst: null },
    });
  });

  return itens;
}

function extractTotais($: cheerio.CheerioAPI): NfceTotais {
  const totais: NfceTotais = {
    quantidadeItens: null,
    valorTotal: null,
    desconto: null,
    valorAPagar: null,
    tributos: null,
    pagamento: { forma: null, valorPago: null, troco: null },
  };

  $('#totalNota #linhaTotal').each((_i, el) => {
    const label = normalizeText($(el).find('label').text());
    const value = normalizeText($(el).find('span').text());

    if (label.startsWith('Qtd. total de itens')) {
      totais.quantidadeItens = parseDecimal(value);
    } else if (label.startsWith('Valor total')) {
      totais.valorTotal = parseDecimal(value);
    } else if (label.startsWith('Descontos')) {
      totais.desconto = parseDecimal(value);
    } else if (label.startsWith('Valor a pagar')) {
      totais.valorAPagar = parseDecimal(value);
    } else if (label.startsWith('Informação dos Tributos')) {
      totais.tributos = parseDecimal(value);
    } else if (label.toLowerCase().includes('cartão') || label.toLowerCase().includes('pix')) {
      totais.pagamento.forma = label || null;
      totais.pagamento.valorPago = parseDecimal(value);
    } else if (label.startsWith('Troco')) {
      totais.pagamento.troco = parseDecimal(value);
    }
  });

  return totais;
}

function extractInfo($: cheerio.CheerioAPI): NfceInfo {
  const infoSection = $('#infos h4')
    .filter((_i, el) => normalizeText($(el).text()).includes('Informações gerais'))
    .first()
    .parent();
  const text = normalizeText(infoSection.text());

  return {
    numero: text.match(/Número:\s*([\d]+)/i)?.[1] ?? null,
    serie: text.match(/Série:\s*([\d]+)/i)?.[1] ?? null,
    emissao: text.match(/Emissão:\s*([\d/: ]+)/i)?.[1]?.trim() ?? null,
    protocolo: text.match(/Protocolo de Autorização:\s*([\d ]+)/i)?.[1]?.trim() ?? null,
    ambiente: text.includes('Ambiente de Produção')
      ? 'Produção'
      : text.includes('Homolog') || text.includes('teste')
        ? 'Homologação'
        : null,
    versaoXml: text.match(/Versão XML:\s*([\d.]+)/i)?.[1] ?? null,
    versaoXslt: text.match(/Versão XSLT:\s*([\d.]+)/i)?.[1] ?? null,
  };
}

function extractConsumidor($: cheerio.CheerioAPI): NfceConsumidor {
  const consumerSection = $('#infos h4')
    .filter((_i, el) => normalizeText($(el).text()).includes('Consumidor'))
    .first()
    .parent();
  const text = normalizeText(consumerSection.text());

  return {
    cpf: text.match(/CPF:\s*([0-9.\-]+)/i)?.[1]?.trim() ?? null,
    nome: text.match(/Nome:\s*([A-Za-zÀ-ÿ' ]*)/i)?.[1]?.trim() || null,
  };
}

function buildFullUrl(url: string): string {
  const pMatch = url.match(/p=([^&]+)/);
  if (!pMatch) throw new Error('URL da NFC-e sem parâmetro p');
  const p = pMatch[1];
  const base = 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx';
  return `${base}?p=${p}`;
}

export async function fetchNfceHtml(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL inválida para NFC-e');
  }

  // Garante URL decodificada (suporta url=...%7C3%7C1)
  const decodedUrl = decodeURIComponent(url);
  const targetUrl = decodedUrl.includes('ConsultaPublica.aspx') ? decodedUrl : buildFullUrl(decodedUrl);
  const noCacheUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;

  const response = await axios.get<string>(noCacheUrl, {
    headers: {
      'User-Agent': 'ScarlatBot/1.0',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'If-Modified-Since': 'Sat, 1 Jan 2000 00:00:00 GMT',
    },
    timeout: 20000,
    responseType: 'text',
    validateStatus: () => true,
  });

  if (response.status === 304 || response.status >= 400) {
    throw new Error(`Falha ao consultar NFC-e (status ${response.status})`);
  }

  logDebug('Fetch HTML (axios) status', response.status, 'length', response.data?.length ?? 0);
  if (nfceDebug && response.data) {
    const snippet = response.data.slice(0, 1500);
    logDebug('HTML snippet (axios):', snippet);
    saveDebugHtml('axios', response.data);
  }
  return response.data;
}

async function fetchNfceHtmlWithBrowser(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 150,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });
  try {
    let page = await browser.newPage();
    if (nfceDebug) {
      page.on('console', (msg) => logDebug('PAGE LOG', msg.type(), msg.text()));
      page.on('pageerror', (err: any) => logDebug('PAGE ERROR', err?.message ?? err));
      page.on('requestfailed', (req) =>
        logDebug('REQUEST FAIL', req.url(), req.failure()?.errorText ?? ''),
      );
    }
await sleep(5000)
    const decodedUrl = decodeURIComponent(url);
    await page.goto(decodedUrl, {waitUntil: 'networkidle2' ,   timeout: 20000 });
    await sleep(1500);
    logDebug('Page loaded, clicking Visualizar em Abas');

    // Executa o postback diretamente; se não existir, tenta o click
    const newPagePromise = new Promise<import('puppeteer').Page | null>((resolve) => {
      const listener = async (target: import('puppeteer').Target) => {
        if (target.opener() === page.target()) {
          const p = await target.page();
          browser.off('targetcreated', listener);
          resolve(p ?? null);
        }
      };
      browser.on('targetcreated', listener);
      setTimeout(() => {
        browser.off('targetcreated', listener);
        resolve(null);
      }, 10000);
    });

    await page.evaluate(() => {
      // @ts-ignore
      if (typeof window.__doPostBack === 'function') {
        // @ts-ignore
        window.__doPostBack('btnVisualizarAbas', '');
      } else {
        const btn = document.getElementById('btnVisualizarAbas') as HTMLInputElement | null;
        btn?.click();
      }
    });

    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null),
      sleep(2000),
    ]);

    const newPage = await newPagePromise;
    if (newPage) {
      logDebug('Nova aba detectada após postback Visualizar em Abas');
      page = newPage;
      await sleep(1500);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null);
    } else {
      logDebug('Sem nova aba, usando mesma página após postback');
    }

    const html = await page.content();
    logDebug('Fetch HTML (puppeteer) length', html.length);
    if (nfceDebug && html) {
      const snippet = html.slice(0, 1500);
      logDebug('HTML snippet (puppeteer):', snippet);
      saveDebugHtml('puppeteer', html);
    }
    return html;
  } finally {
    await browser.close();
  }
}

export function parseNfceMobile(html: string): NfceData {
  const $ = cheerio.load(html);

  const emitente = extractEmitente($);
  const itens = extractItens($);
  const totais = extractTotais($);
  const info = extractInfo($);
  const consumidor = extractConsumidor($);

  const chaveRaw = normalizeText($('.chave').text());
  const chaveAcesso = chaveRaw || null;
  const chaveAcessoNumerica = chaveRaw ? chaveRaw.replace(/\s+/g, '') : null;

  return { emitente, itens, totais, info, chaveAcesso, chaveAcessoNumerica, consumidor };
}

function findValueByLabel($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>, startsWith: string) {
  let result: string | null = null;
  container.find('td').each((_i: number, td: any) => {
    const label = normalizeLabel($(td).find('label').text());
    if (!label || !label.startsWith(normalizeLabel(startsWith))) return;
    const val = normalizeText($(td).find('span').text());
    if (val) result = val;
  });
  return result;
}

function findValueByLabelIn(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<any>,
  startsWith: string,
): string | null {
  let result: string | null = null;
  container.find('label').each((_i: number, label: any) => {
    const text = normalizeLabel($(label).text());
    if (!text.startsWith(normalizeLabel(startsWith))) return;
    const span = $(label).parent().find('span').first();
    const val = normalizeText(span.text());
    if (val) result = val;
    return false;
  });
  return result;
}

function findValueByLabelContains(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<any>,
  needle: string,
): string | null {
  let result: string | null = null;
  container.find('label').each((_i: number, label: any) => {
    const text = normalizeLabel($(label).text());
    if (!text.includes(normalizeLabel(needle))) return;
    const span = $(label).parent().find('span').first();
    const val = normalizeText(span.text());
    if (val) result = val;
    return false;
  });
  return result;
}

function findCfop(
  $: cheerio.CheerioAPI,
  detailTable: cheerio.Cheerio<any>,
): string | null {
  // 1) label que contém CFOP
  const cfopLabel = detailTable
    .find('label')
    .filter((_i, el) => normalizeText($(el).text()).toLowerCase().includes('cfop'))
    .first();
  if (cfopLabel.length) {
    const val = normalizeText(cfopLabel.parent().find('span').first().text());
    if (val) return val;
  }

  // 2) fallback posicional: 3ª linha (index 2), 2ª célula (index 1), 1º span
  const positional = normalizeText(
    detailTable.find('table.box').first().find('tr').eq(2).find('span').eq(1).text(),
  );
  return positional || null;
}

function findNumberByLabelIn(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<any>,
  startsWith: string,
): Nullable<number> {
  const val = findValueByLabelIn($, container, startsWith);
  return parseDecimal(val);
}

function findFirst(table: cheerio.Cheerio<any>, row: number, col: number): cheerio.Cheerio<any> {
  return table.find('tr').eq(row).find('td').eq(col);
}

function parseNfceFull(html: string): NfceData {
  const $ = cheerio.load(html);

  const container = $('#pnlDadosNFCeId').length ? $('#pnlDadosNFCeId') : $('.pnlDadosNFe2');
  const headerTable = container.find('table').first();
  const headerDataRow = headerTable.find('tr').eq(1);
  const chaveAcesso = normalizeText(headerDataRow.find('td').eq(0).text()) || null;

  const nfeTab = $('#NFe');
  const infoTable = nfeTab.find('table.box').first();
  const info: NfceInfo = {
    numero: normalizeText(findFirst(infoTable, 0, 2).find('span').text()) || null,
    serie: normalizeText(findFirst(infoTable, 0, 1).find('span').text()) || null,
    emissao: normalizeText(findFirst(infoTable, 0, 3).find('span').text()) || null,
    protocolo: $('#nProt').val() ? String($('#nProt').val()) : null,
    ambiente: nfeTab.text().includes('produção') ? 'Produção' : null,
    versaoXml: normalizeText(headerDataRow.find('td').eq(2).text()) || null,
    versaoXslt: normalizeText($('#Inf #Versao').text().replace('XSLT:', '')) || null,
  };

  const emitenteBox = $('#Emitente table.box');
  const emitente: NfceEmitente = {
    nome: findValueByLabel($, emitenteBox, 'Nome / Razão Social'),
    cnpj: findValueByLabel($, emitenteBox, 'CNPJ'),
    endereco: [
      findValueByLabel($, emitenteBox, 'Endereço'),
      findValueByLabel($, emitenteBox, 'Bairro'),
      findValueByLabel($, emitenteBox, 'Município'),
      findValueByLabel($, emitenteBox, 'UF'),
      findValueByLabel($, emitenteBox, 'CEP'),
    ]
      .filter(Boolean)
      .join(', ') || null,
  };

  const destBox = $('#DestRem table.box');
  const consumidor: NfceConsumidor = {
    cpf: findValueByLabel($, destBox, 'CPF'),
    nome: findValueByLabel($, destBox, 'Nome / Razão Social'),
  };

  const itens: NfceItem[] = [];
  container.find('#Prod table.toggle.box').each((_i, table) => {
    const spans = $(table).find('tr').first().find('span');
    if (!spans.length) return;
    const numero = normalizeText(spans.eq(0).text());
    const descricao = normalizeText(spans.eq(1).text());
    if (!descricao) return;
    const qtd = parseDecimal(spans.eq(2).text());
    const unidade = normalizeText(spans.eq(3).text()) || null;
    const valor = parseDecimal(spans.eq(4).text());

    // código do produto está na tabela de detalhes seguinte com class toggable
    const detailTable = $(table).next('table.toggable');
    const codigo = findValueByLabelIn($, detailTable, 'Código do Produto');
    const valorUnitario = findValueByLabelIn($, detailTable, 'Valor unitário de comercialização');
    const ncm = findValueByLabelIn($, detailTable, 'Código NCM');
    const cest = findValueByLabelIn($, detailTable, 'Código CEST');
    const cfop = findCfop($, detailTable);
    const eanComercial = findValueByLabelIn($, detailTable, 'Código EAN Comercial');
    const valorAproxTributos = findNumberByLabelIn($, detailTable, 'Valor Aproximado dos Tributos');

    const icms = {
      baseCalculo: findNumberByLabelIn($, detailTable, 'Base de Cálculo do ICMS Normal'),
      aliquota: findNumberByLabelIn($, detailTable, 'Alíquota do ICMS Normal'),
      valor: findNumberByLabelIn($, detailTable, 'Valor do ICMS Normal'),
      cst: findValueByLabelContains($, detailTable, 'cst do icms')
        || findValueByLabelContains($, detailTable, 'tributacao do icms')
        || findValueByLabelContains($, detailTable, 'tributacao')
        || findValueByLabelContains($, detailTable, 'cst'),
      csosn: findValueByLabelContains($, detailTable, 'csosn'),
      icmsStRetido: findNumberByLabelIn($, detailTable, 'Valor do ICMS ST retido'),
      fcpStRetido: findNumberByLabelIn(
        $,
        detailTable,
        'Valor do FCP retido anteriormente por Substituição Tributária'
      ),
      icmsEfetivo: findNumberByLabelIn($, detailTable, 'Valor do ICMS efetivo'),
    };

    const pisBox = detailTable.find('legend').filter((_j, el) => normalizeText($(el).text()).includes('PIS')).first().closest('fieldset');
    const pis = {
      baseCalculo: pisBox.length ? findNumberByLabelIn($, pisBox, 'Base de Cálculo') : null,
      aliquota: pisBox.length ? findNumberByLabelIn($, pisBox, 'Alíquota') : null,
      valor: pisBox.length ? findNumberByLabelIn($, pisBox, 'Valor') : null,
      cst: pisBox.length ? findValueByLabelContains($, pisBox, 'cst') : findValueByLabelContains($, detailTable, 'cst do pis'),
    };

    const cofinsBox = detailTable.find('legend').filter((_j, el) => normalizeText($(el).text()).includes('COFINS')).first().closest('fieldset');
    const cofins = {
      baseCalculo: cofinsBox.length ? findNumberByLabelIn($, cofinsBox, 'Base de Cálculo') : null,
      aliquota: cofinsBox.length ? findNumberByLabelIn($, cofinsBox, 'Alíquota') : null,
      valor: cofinsBox.length ? findNumberByLabelIn($, cofinsBox, 'Valor') : null,
      cst: cofinsBox.length ? findValueByLabelContains($, cofinsBox, 'cst') : findValueByLabelContains($, detailTable, 'cst do cofins'),
    };

    itens.push({
      descricao,
      codigo: codigo || numero || null,
      quantidade: qtd,
      unidade,
      valorUnitario: parseDecimal(valorUnitario),
      valorTotal: valor,
      ncm: ncm || null,
      cest: cest || null,
      cfop: cfop || null,
      eanComercial: eanComercial || null,
      icms,
      pis,
      cofins,
      valorAproxTributos,
    });
  });

  const totaisBox = $('#Totais table.box');
  const pagamentoRow = $('#Cobranca table.toggle.box').first().find('tr');
  const pagamentoSpans = pagamentoRow.find('span');
  const totais: NfceTotais = {
    quantidadeItens: parseDecimal(findValueByLabel($, headerTable, 'Qtd. total de itens') ?? '') ||
      parseDecimal(findValueByLabel($, totaisBox, 'Valor Total dos Produtos') ?? ''),
    valorTotal: parseDecimal(findValueByLabel($, totaisBox, 'Valor Total da NFe')),
    desconto: parseDecimal(findValueByLabel($, totaisBox, 'Valor Total dos Descontos')),
    valorAPagar: parseDecimal(findValueByLabel($, infoTable, 'Valor Total da Nota Fiscal')),
    tributos: parseDecimal(findValueByLabel($, totaisBox, 'Valor Aproximado dos Tributos')),
    pagamento: {
      forma: normalizeText(pagamentoSpans.eq(1).text()) || null,
      valorPago: parseDecimal(pagamentoSpans.eq(2).text()),
      troco: null,
    },
  };

  return {
    emitente,
    itens,
    totais,
    info,
    chaveAcesso,
    chaveAcessoNumerica: chaveAcesso ? chaveAcesso.replace(/\D+/g, '') : null,
    consumidor,
  };
}

export async function scrapeNfce(url: string): Promise<NfceData> {
  // tenta visão completa via navegação/click no botão; se falhar, cai no fetch simples
  let html: string;
  try {
    logDebug('Tentando via Puppeteer');
    html = await fetchNfceHtmlWithBrowser(url);
  } catch {
    logDebug('Puppeteer falhou, usando fetch simples');
    html = await fetchNfceHtml(url);
  }

  const dataFull = parseNfceFull(html);
  logDebug('Parse completo: itens', dataFull.itens.length, 'emitente', dataFull.emitente.nome);
  if (dataFull.itens.length) return dataFull;
  logDebug('Sem itens na visão completa, tentando parser mobile');
  return parseNfceMobile(html);
}

