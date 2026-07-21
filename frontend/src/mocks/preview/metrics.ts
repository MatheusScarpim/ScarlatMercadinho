// @mathai-preview-scaffold-v4
import { http, HttpResponse } from 'msw';

/**
 * Handlers de preview para o Dashboard (métricas + lojas/unidades).
 * Cobrem as chamadas de DashboardView.vue: GET /metrics (com filtro de loja
 * via query `location`) e GET /locations (popula o seletor de loja).
 */

const PREVIEW_LOCATIONS = [
  { _id: 'loc-1', name: 'Loja Centro', code: 'CENTRO', active: true },
  { _id: 'loc-2', name: 'Loja Shopping', code: 'SHOPPING', active: true },
  { _id: 'loc-3', name: 'Loja Bairro', code: 'BAIRRO', active: true },
  { _id: 'loc-4', name: 'Loja Rodoviária', code: 'RODOVIARIA', active: false }
];

function buildOverview(location: string | null) {
  // Escala os números por loja só pra deixar o filtro visível no preview.
  const factor = location === 'SHOPPING' ? 1.6 : location === 'BAIRRO' ? 0.6 : 1;
  const revenue = Math.round(18450.75 * factor * 100) / 100;
  const salesCount = Math.round(312 * factor);
  const itemsSold = Math.round(1284 * factor);

  return {
    revenue,
    salesCount,
    itemsSold,
    avgTicket: salesCount ? Math.round((revenue / salesCount) * 100) / 100 : 0,
    daily: [
      { _id: '2026-07-14', total: Math.round(2100 * factor) },
      { _id: '2026-07-15', total: Math.round(2450 * factor) },
      { _id: '2026-07-16', total: Math.round(1980 * factor) },
      { _id: '2026-07-17', total: Math.round(3120 * factor) },
      { _id: '2026-07-18', total: Math.round(2760 * factor) }
    ],
    payments: [
      { _id: 'CASH', total: Math.round(6200 * factor), count: Math.round(120 * factor) },
      { _id: 'PIX', total: Math.round(7100 * factor), count: Math.round(110 * factor) },
      { _id: 'CREDIT_CARD', total: Math.round(3900 * factor), count: Math.round(60 * factor) },
      { _id: 'DEBIT_CARD', total: Math.round(1250 * factor), count: Math.round(22 * factor) }
    ],
    topProducts: [
      { id: 'p-1', name: 'Água Mineral 500ml', quantity: Math.round(210 * factor), total: Math.round(630 * factor) },
      { id: 'p-2', name: 'Refrigerante Lata', quantity: Math.round(180 * factor), total: Math.round(900 * factor) },
      { id: 'p-3', name: 'Salgadinho 90g', quantity: Math.round(140 * factor), total: Math.round(700 * factor) },
      { id: 'p-4', name: 'Chocolate Barra', quantity: Math.round(95 * factor), total: Math.round(475 * factor) },
      { id: 'p-5', name: 'Café Expresso', quantity: Math.round(80 * factor), total: Math.round(400 * factor) }
    ]
  };
}

export const metricsHandlers = [
  http.get('*/metrics', ({ request }) => {
    const url = new URL(request.url);
    const location = url.searchParams.get('location');
    return HttpResponse.json(buildOverview(location && location.trim() ? location.trim() : null));
  }),

  http.get('*/locations', () => HttpResponse.json(PREVIEW_LOCATIONS))

  // Exemplo de caminho de erro (descomente para testar estado de falha):
  // http.get('*/metrics', () => new HttpResponse(null, { status: 500 }))
];
