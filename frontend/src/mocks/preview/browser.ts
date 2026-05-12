// @mathai-preview-scaffold-v4
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Sessao fake injetada antes do worker subir — mata redirects pra tela de login. */
const PREVIEW_USER = {
  id: 'preview-user',
  name: 'Preview User',
  email: 'preview@mathai.dev',
  role: 'ADMIN',
  permissions: ['*']
};
const PREVIEW_TOKEN = 'preview-fake-token';

try {
  // Chaves mais comuns — apps diferentes usam nomes diferentes.
  localStorage.setItem('token', PREVIEW_TOKEN);
  localStorage.setItem('accessToken', PREVIEW_TOKEN);
  localStorage.setItem('auth_token', PREVIEW_TOKEN);
  localStorage.setItem('authToken', PREVIEW_TOKEN);
  localStorage.setItem('user', JSON.stringify(PREVIEW_USER));
  localStorage.setItem('currentUser', JSON.stringify(PREVIEW_USER));
  localStorage.setItem('auth', JSON.stringify({ token: PREVIEW_TOKEN, user: PREVIEW_USER }));
} catch { /* ignore — localStorage pode estar bloqueado */ }

export const worker = setupWorker(...handlers);
