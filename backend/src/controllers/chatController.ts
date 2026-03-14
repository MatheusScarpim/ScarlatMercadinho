import { Request, Response } from 'express';
import {
  isBusinessHours,
  sendAiMessage,
  sendCustomerMessage,
  sendAdminMessage,
  getActiveSessions,
  getSessionMessages,
  closeSession,
} from '../services/chatService';

/** GET /chat/status — retorna se é horário comercial */
export async function status(_req: Request, res: Response) {
  res.json({ businessHours: isBusinessHours() });
}

/** POST /chat/send — cliente envia mensagem */
export async function send(req: Request, res: Response) {
  const { sessionId, message, customerName, location } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId e message são obrigatórios' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'Mensagem muito longa (máx 1000 caracteres)' });
  }

  const inBusinessHours = isBusinessHours();

  if (inBusinessHours) {
    // Horário comercial: salva e aguarda resposta de admin
    const msg = await sendCustomerMessage(sessionId, message, customerName, location);
    return res.json({ mode: 'human', message: msg });
  }

  // Fora do horário: responde com IA
  const aiMsg = await sendAiMessage(sessionId, message, customerName, location);
  return res.json({ mode: 'ai', message: aiMsg });
}

/** GET /chat/messages/:sessionId — busca mensagens de uma sessão */
export async function messages(req: Request, res: Response) {
  const { sessionId } = req.params;
  const msgs = await getSessionMessages(sessionId);
  res.json(msgs);
}

// ── Admin endpoints (requerem auth) ──

/** GET /chat/sessions — lista sessões ativas */
export async function sessions(_req: Request, res: Response) {
  const data = await getActiveSessions();
  res.json(data);
}

/** POST /chat/reply — admin responde */
export async function reply(req: Request, res: Response) {
  const { sessionId, message } = req.body;
  const adminId = (req as any).userId;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId e message são obrigatórios' });
  }

  const msg = await sendAdminMessage(sessionId, message, adminId);
  res.json(msg);
}

/** POST /chat/close — admin fecha sessão */
export async function close(req: Request, res: Response) {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId é obrigatório' });
  }
  await closeSession(sessionId);
  res.json({ ok: true });
}
