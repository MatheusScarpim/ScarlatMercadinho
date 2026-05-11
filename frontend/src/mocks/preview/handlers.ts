// @mathai-preview-scaffold-v2
import { http, HttpResponse } from 'msw';

/**
 * Handlers MSW pro modo preview.
 * Cobre auth-bypass generico — substitua/adicione conforme a app evolui.
 */

const PREVIEW_USER = {
  id: 'preview-user',
  name: 'Preview User',
  email: 'preview@mathai.dev',
  role: 'ADMIN',
  permissions: ['*']
};
const PREVIEW_TOKEN = 'preview-fake-token';

export const handlers = [
  // ─── Auth ───────────────────────────────────────────────
  http.post('*/auth/login', () =>
    HttpResponse.json({ token: PREVIEW_TOKEN, user: PREVIEW_USER })
  ),
  http.post('*/api/auth/login', () =>
    HttpResponse.json({ token: PREVIEW_TOKEN, user: PREVIEW_USER })
  ),
  http.post('*/login', () =>
    HttpResponse.json({ token: PREVIEW_TOKEN, user: PREVIEW_USER })
  ),
  http.post('*/auth/logout', () => HttpResponse.json({ ok: true })),
  http.post('*/auth/refresh', () =>
    HttpResponse.json({ token: PREVIEW_TOKEN, user: PREVIEW_USER })
  ),
  http.get('*/auth/me', () => HttpResponse.json(PREVIEW_USER)),
  http.get('*/me', () => HttpResponse.json(PREVIEW_USER)),
  http.get('*/api/me', () => HttpResponse.json(PREVIEW_USER)),
  http.get('*/user', () => HttpResponse.json(PREVIEW_USER)),

  // ─── Catch-all final ────────────────────────────────────
  // Qualquer GET /api/* ou /api/v1/* desconhecido devolve lista/objeto vazio
  // pra app nao crashar na ausencia de backend. Adicione handlers especificos
  // ACIMA deste catch-all conforme features novas precisarem de mock.
  http.get('*/api/*', ({ request }) => {
    const url = new URL(request.url);
    // Heuristica: se a path termina com /list ou /items ou tem query de pagination,
    // devolve array; senao, objeto vazio.
    const looksLikeList = /\/(list|items|all)$/i.test(url.pathname) || url.searchParams.has('page');
    return HttpResponse.json(looksLikeList ? [] : {});
  }),
  http.post('*/api/*', () => HttpResponse.json({ ok: true })),
  http.put('*/api/*', () => HttpResponse.json({ ok: true })),
  http.patch('*/api/*', () => HttpResponse.json({ ok: true })),
  http.delete('*/api/*', () => HttpResponse.json({ ok: true }))
];
