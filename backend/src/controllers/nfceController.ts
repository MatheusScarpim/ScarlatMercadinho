import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { scrapeNfce } from '../services/nfceService';
import { NfceModel } from '../models/Nfce';
import { PurchaseModel } from '../models/Purchase';
import { SaleModel } from '../models/Sale';
import { SaleItemModel } from '../models/SaleItem';

export async function getNfce(req: Request, res: Response) {
  const { url } = req.query;
  if (typeof url !== 'string') {
    return res.status(400).json({ message: 'Parametro "url" e obrigatorio' });
  }

  const data = await scrapeNfce(url);

  // Persistimos a ultima captura para historico/fiscal.
  try {
    await NfceModel.findOneAndUpdate(
      {
        $or: [
          { chaveAcesso: data.chaveAcesso ?? undefined },
          { chaveAcessoNumerica: data.chaveAcessoNumerica ?? undefined },
        ],
      },
      {
        $set: {
          chaveAcesso: data.chaveAcesso,
          chaveAcessoNumerica: data.chaveAcessoNumerica,
          data,
          lastFetchedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[NFCE] Falha ao persistir', err);
  }

  res
    .set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    .set('Pragma', 'no-cache')
    .set('Expires', '0')
    .set('Surrogate-Control', 'no-store')
    .set('ETag', `${Date.now()}`) // forca ETag unico para evitar 304
    .status(200)
    .json(data);
}

// Visao fiscal: entradas (compras), saidas (vendas) e NFC-e capturadas.
export async function getFiscalOverview(_req: Request, res: Response) {
  const [purchases, sales, nfces] = await Promise.all([
    PurchaseModel.find({})
      .populate('supplier createdBy items.product')
      .sort({ issueDate: -1 })
      .limit(100),
    SaleModel.find({ status: { $ne: 'CANCELED' } })
      .sort({ createdAt: -1 })
      .limit(200),
    NfceModel.find({}).sort({ updatedAt: -1 }).limit(200),
  ]);

  // Garante itens das vendas (saidas) para cruzamento rapido
  const saleIds = sales.map((s) => s._id);
  const saleItems = await SaleItemModel.find({ sale: { $in: saleIds } }).populate('product');

  const salesWithItems = sales.map((sale) => ({
    sale,
    items: saleItems.filter((it) => it.sale.equals(sale._id)),
  }));

  res.json({
    purchases,
    sales: salesWithItems,
    nfces,
  });
}

function buildDateFilter(field: string, from?: string, to?: string) {
  const filter: any = {};
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && !isNaN(fromDate.getTime())) filter.$gte = fromDate;
  if (toDate && !isNaN(toDate.getTime())) filter.$lte = toDate;
  return Object.keys(filter).length ? { [field]: filter } : {};
}

export async function exportFiscalSummary(req: Request, res: Response) {
  const { from, to } = req.query as { from?: string; to?: string };
  const purchaseFilter = buildDateFilter('issueDate', from, to);
  const saleFilter = { status: { $ne: 'CANCELED' }, ...buildDateFilter('createdAt', from, to) };
  const nfceFilter = buildDateFilter('lastFetchedAt', from, to);

  const [purchases, sales, nfces] = await Promise.all([
    PurchaseModel.find(purchaseFilter)
      .select('totalAmount issueDate arrivalDate invoiceNumber location supplier items')
      .populate('supplier')
      .populate('items.product'),
    SaleModel.find(saleFilter).select('totalAmount createdAt completedAt status'),
    NfceModel.find(nfceFilter).select(
      'data.totais.valorTotal data.itens data.info.emissao data.emitente data.chaveAcesso lastFetchedAt chaveAcesso chaveAcessoNumerica',
    ),
  ]);

  const purchasesTotal = purchases.reduce((sum, p: any) => sum + Number(p.totalAmount || 0), 0);
  const salesTotal = sales.reduce((sum, s: any) => sum + Number(s.totalAmount || 0), 0);
  const nfceTotal = nfces.reduce(
    (sum, n: any) => sum + Number(n?.data?.totais?.valorTotal || 0),
    0,
  );

  // Carrega itens de venda para contagem rapida e detalhamento
  const saleIds = sales.map((s) => s._id);
  const saleItems = await SaleItemModel.find({ sale: { $in: saleIds } })
    .select('sale quantity unitPrice total')
    .populate('product');
  const saleItemsCount = new Map<string, number>();
  saleItems.forEach((it) => {
    const key = it.sale.toString();
    const qty = Number((it as any).quantity || 0);
    saleItemsCount.set(key, (saleItemsCount.get(key) || 0) + qty);
  });

  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  const fileName = `fiscal-completo-${Date.now()}.pdf`;
  res
    .setHeader('Content-Type', 'application/pdf')
    .setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    .status(200);
  doc.pipe(res);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
  };
  const currency = (value: number | null | undefined) => `R$ ${Number(value || 0).toFixed(2)}`;

  const line = () => {
    doc.moveDown(0.3);
    doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.6);
  };

  doc.fontSize(18).fillColor('#1f2933').text('Relatorio Fiscal Completo', { align: 'center', underline: true });
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor('#52606d').text(`Periodo: ${from || '-'} a ${to || '-'}`);
  doc.moveDown(0.2);
  doc.fontSize(11).fillColor('#1f2933').text(
    `Totais -> Compras: ${currency(purchasesTotal)} | Vendas: ${currency(
      salesTotal,
    )} | NFC-e: ${currency(nfceTotal)}`,
  );
  line();

  purchases.forEach((p: any) => {
    doc.fontSize(12).fillColor('#0f766e').text('Compra', { underline: true });
    doc.fontSize(10).fillColor('#1f2933').text(
      `Data: ${formatDate(p.issueDate)} | Nota: ${p.invoiceNumber || '-'} | Fornecedor: ${
        p.supplier?.name || '-'
      } (${p.supplier?.cnpj || '-'}) | Local: ${p.location || '-'} | Total: ${currency(
        p.totalAmount,
      )} | Itens: ${Array.isArray(p.items) ? p.items.length : 0}`,
    );
    doc.text(`Chegada: ${formatDate(p.arrivalDate)}`);

    (p.items || []).forEach((it: any) => {
      const prod = it.product || {};
      const prodName = prod.name || it.name || '';
      const barcode = prod.barcode || it.barcode || '';
      doc
        .fontSize(9)
        .fillColor('#52606d')
        .text(
          `  - ${prodName} | EAN: ${barcode || '-'} | NCM: ${prod.ncm || '-'} | CFOP: ${
            it.cfop || prod.cfop || '-'
          } | CST: ${prod.cst || prod.csosn || '-'} | Qtde: ${it.quantity || 0} | Custo: ${currency(
            it.unitCost,
          )} | Total: ${currency(it.totalCost || it.quantity * it.unitCost || 0)}`,
        );
    });
    doc.moveDown(0.5);
    line();
  });

  sales.forEach((s: any) => {
    const count = saleItemsCount.get(s._id.toString()) || '';
    doc.fontSize(12).fillColor('#0f766e').text('Venda', { underline: true });
    doc
      .fontSize(10)
      .fillColor('#1f2933')
      .text(
        `Data: ${formatDate(s.createdAt)} | ID: ${s._id?.toString() || '-'} | Total: ${currency(
          s.totalAmount,
        )} | Itens: ${count} | Status: ${s.status || '-'} | Finalizada: ${formatDate(
          s.completedAt,
        )}`,
      );

    saleItems
      .filter((it) => it.sale.toString() === s._id.toString())
      .forEach((it) => {
        const prod: any = (it as any).product || {};
        const prodName = prod.name || '';
        const barcode = prod.barcode || '';
        doc
          .fontSize(9)
          .fillColor('#52606d')
          .text(
            `  - ${prodName} | EAN: ${barcode || '-'} | NCM: ${prod.ncm || '-'} | CFOP: ${
              prod.cfop || '-'
            } | CST: ${prod.cst || prod.csosn || '-'} | Qtde: ${(it as any).quantity || 0} | Preco: ${currency(
              (it as any).unitPrice,
            )} | Total: ${currency((it as any).total)}`,
          );
      });
    doc.moveDown(0.5);
    line();
  });

  nfces.forEach((n: any) => {
    doc.fontSize(12).fillColor('#0f766e').text('NFC-e', { underline: true });
    doc
      .fontSize(10)
      .fillColor('#1f2933')
      .text(
        `Data: ${n?.data?.info?.emissao || formatDate(n.lastFetchedAt)} | Emitente: ${
          n?.data?.emitente?.nome || '-'
        } (${n?.data?.emitente?.cnpj || '-'}) | Valor: ${currency(
          n?.data?.totais?.valorTotal,
        )} | Itens: ${Array.isArray(n?.data?.itens) ? n.data.itens.length : 0} | Chave: ${
          n.chaveAcesso || n.chaveAcessoNumerica || '-'
        }`,
      );
    // Itens da NFC-e com cenarios fiscais (CST/CFOP/NCM)
    (n?.data?.itens || []).forEach((it: any) => {
      doc
        .fontSize(9)
        .fillColor('#52606d')
        .text(
          `  - ${it.descricao || ''} | NCM: ${it.ncm || '-'} | CFOP: ${it.cfop || '-'} | CST: ${
            it.icms?.cst || it.icms?.csosn || '-'
          } | Aliq ICMS: ${it.icms?.aliquota ?? '-'} | PIS: ${
            it.pis?.cst || '-'
          } | COFINS: ${it.cofins?.cst || '-'}`,
        );
    });
    doc.moveDown(0.5);
    line();
  });

  doc
    .fontSize(11)
    .fillColor('#1f2933')
    .text(
      `Resumo: Compras ${purchases.length} | Vendas ${sales.length} | NFC-e ${nfces.length} | Valor total ${currency(
        purchasesTotal + salesTotal + nfceTotal,
      )}`,
      { align: 'left' },
    );

  doc.end();
}



