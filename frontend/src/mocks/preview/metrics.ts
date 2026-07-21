// @mathai-preview-scaffold-v4
import { http, HttpResponse } from 'msw';

/**
 * Handler MSW pro modo preview do recurso "metrics".
 * Formato alinhado ao que a DashboardView espera:
 * revenue, salesCount, itemsSold, avgTicket, daily[{_id,total}],
 * payments[{_id,total}], topProducts[{id,name,quantity,total}].
 *
 * Reage ao filtro location_id: quando presente, retorna números reduzidos
 * pra demonstrar que a seleção de loja atualiza o dashboard.
 */

function buildOverview(locationId: string | null) {
  const factor = locationId ? 0.4 : 1;
  const r = (v: number) => Math.round(v * factor * 100) / 100;

  const revenue = r(15240.75);
  const salesCount = Math.round(320 * factor);
  const itemsSold = Math.round(1180 * factor);
  const avgTicket = salesCount ? Math.round((revenue / salesCount) * 100) / 100 : 0;

  return {
    revenue,
    salesCount,
    itemsSold,
    avgTicket,
    daily: [
      { _id: '2026-07-14', total: r(1850.5) },
      { _id: '2026-07-15', total: r(2100.0) },
      { _id: '2026-07-16', total: r(1990.25) },
      { _id: '2026-07-17', total: r(2450.75) },
      { _id: '2026-07-18', total: r(3100.0) }
    ],
    payments: [
      { _id: 'CASH', total: r(4200.0) },
      { _id: 'CREDIT_CARD', total: r(6100.5) },
      { _id: 'DEBIT_CARD', total: r(3200.25) },
      { _id: 'PIX', total: r(1740.0) }
    ],
    topProducts: [
      { id: 'prod-001', name: 'Coca-Cola 2L', quantity: Math.round(140 * factor), total: r(1260.0) },
      { id: 'prod-002', name: 'Pão Francês (kg)', quantity: Math.round(120 * factor), total: r(960.0) },
      { id: 'prod-003', name: 'Leite Integral 1L', quantity: Math.round(95 * factor), total: r(570.0) },
      { id: 'prod-004', name: 'Arroz 5kg', quantity: Math.round(60 * factor), total: r(1500.0) }
    ]
  };
}

export const metricsHandlers = [
  http.get('*/metrics', ({ request }) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get('location_id');
    return HttpResponse.json(buildOverview(locationId));
  })

  // Exemplo de caminho de erro (500) — descomente para testar estados de falha:
  // http.get('*/metrics', () =>
  //   HttpResponse.json({ message: 'Falha ao carregar métricas' }, { status: 500 })
  // )
];
