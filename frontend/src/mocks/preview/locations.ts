// @mathai-preview-scaffold-v4
import { http, HttpResponse } from 'msw';

/**
 * Handler MSW pro modo preview do recurso "locations".
 * Formato alinhado ao que a UI (DashboardView / LocationsView) espera:
 * array de locais com _id, name, code e active.
 */

const LOCATIONS = [
  { _id: 'loc-001', name: 'Mercadinho Centro', code: 'CENTRO', active: true, description: 'Loja matriz no centro' },
  { _id: 'loc-002', name: 'Mercadinho Bairro Sul', code: 'SUL', active: true, description: 'Filial zona sul' },
  { _id: 'loc-003', name: 'Mercadinho Shopping', code: 'SHOP', active: true, description: 'Quiosque no shopping' },
  { _id: 'loc-004', name: 'Mercadinho Praça', code: 'PRACA', active: false, description: 'Unidade desativada' }
];

export const locationsHandlers = [
  http.get('*/locations', () => HttpResponse.json(LOCATIONS))

  // Exemplo de caminho de erro (500) — descomente para testar estados de falha:
  // http.get('*/locations', () =>
  //   HttpResponse.json({ message: 'Falha ao carregar lojas' }, { status: 500 })
  // )
];
