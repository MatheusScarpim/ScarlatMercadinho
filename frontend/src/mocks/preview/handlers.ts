import { http, HttpResponse } from 'msw';

/**
 * Handlers MSW pro modo preview.
 * O code agent vai adicionar handlers aqui automaticamente quando
 * a task adicionar chamadas /api/* novas.
 */
export const handlers: Parameters<typeof import('msw').setupServer>[number][] = [];

// Exemplo (descomente pra testar):
// http.get('/api/example', () => HttpResponse.json({ ok: true })),
