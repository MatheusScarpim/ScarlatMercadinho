import axios from 'axios';
import { ChatMessageModel, type ChatMessageDocument } from '../models/ChatMessage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const FAQ_ITEMS = [
  { q: 'Como funciona o mercadinho?', a: 'Nosso mercadinho funciona por autoatendimento dentro do condomínio. Basta escanear os produtos, adicionar ao carrinho e pagar pelo terminal.' },
  { q: 'Quais formas de pagamento?', a: 'Aceitamos PIX, cartão de crédito e débito. Basta finalizar a compra e escolher a forma de pagamento no terminal.' },
  { q: 'Como escanear produtos?', a: 'Posicione o código de barras do produto em frente ao leitor. O produto será adicionado automaticamente ao carrinho.' },
  { q: 'Posso remover um item do carrinho?', a: 'Sim! Clique no "x" ao lado do item ou use os botões - e + para ajustar a quantidade.' },
  { q: 'O que fazer se o produto não foi encontrado?', a: 'Clique em "Digitar código" e insira o código de barras manualmente. Se ainda não funcionar, entre em contato pelo chat.' },
  { q: 'Como ver as promoções?', a: 'Clique em "Promoções" no topo do carrinho. Produtos próximos do vencimento têm desconto automático!' },
  { q: 'Qual o horário de funcionamento?', a: 'O mercadinho fica disponível 24 horas para compras. O atendimento humano funciona de segunda a sábado, das 8:30 às 18:00.' },
  { q: 'Como falar com um atendente?', a: 'Durante o horário comercial (8:30-18:00, seg-sáb), você pode usar este chat para falar diretamente com nossa equipe. Fora do horário, nosso assistente virtual te ajuda!' },
  { q: 'Como funciona a reposição de produtos?', a: 'A equipe faz a reposição dos produtos regularmente. Se sentir falta de algum item, avise pelo chat que providenciamos.' },
  { q: 'Posso sugerir novos produtos?', a: 'Claro! Envie sua sugestão pelo chat durante o horário comercial e nossa equipe vai avaliar.' },
];

/**
 * Verifica se está dentro do horário comercial (8:30 - 18:00)
 */
export function isBusinessHours(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 8:30 = 510min, 18:00 = 1080min
  const dayOfWeek = now.getDay(); // 0=domingo, 6=sábado
  if (dayOfWeek === 0) return false; // domingo fechado

  return totalMinutes >= 510 && totalMinutes < 1080;
}

/**
 * Envia mensagem do cliente e obtém resposta da IA (fora do horário)
 */
export async function sendAiMessage(
  sessionId: string,
  userMessage: string,
  customerName?: string,
  location?: string,
): Promise<ChatMessageDocument> {
  // Salva a mensagem do cliente
  await ChatMessageModel.create({
    sessionId,
    sender: 'CUSTOMER',
    message: userMessage,
    customerName,
    location,
  });

  // Busca histórico da sessão para contexto
  const history = await ChatMessageModel.find({ sessionId })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  const faqContext = FAQ_ITEMS.map(f => `P: ${f.q}\nR: ${f.a}`).join('\n\n');

  const systemPrompt = `Você é o assistente virtual de um mercadinho de autoatendimento localizado dentro de um condomínio. Seu nome é Assistente Virtual.
O mercadinho funciona 24 horas para compras no terminal de autoatendimento, mas o atendimento humano é de segunda a sábado, das 8:30 às 18:00.
Responda de forma educada, objetiva e em português brasileiro. Seja simpático e prestativo com os moradores.
Use as informações do FAQ abaixo para responder perguntas frequentes.
Se não souber a resposta, sugira que o morador volte durante o horário comercial (8:30-18:00, seg-sáb) para falar com um atendente humano.
Não invente informações sobre preços ou produtos específicos.
Se o morador quiser sugerir produtos ou relatar problemas, anote a sugestão e diga que a equipe será notificada no próximo horário comercial.

FAQ:
${faqContext}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map(m => ({
      role: (m.sender === 'CUSTOMER' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.message,
    })),
  ];

  let aiResponse = 'Desculpe, não consegui processar sua mensagem. Tente novamente mais tarde ou volte durante o horário comercial (8:30-18:00).';

  if (OPENAI_API_KEY) {
    try {
      const { data } = await axios.post(
        `${OPENAI_BASE_URL}/chat/completions`,
        {
          model: OPENAI_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string') {
        aiResponse = content.trim();
      }
    } catch (err: any) {
      console.error('[CHAT] Erro OpenAI:', err?.response?.data?.error?.message || err?.message);
    }
  }

  // Salva resposta da IA
  const aiMsg = await ChatMessageModel.create({
    sessionId,
    sender: 'AI',
    message: aiResponse,
    customerName,
    location,
  });

  return aiMsg;
}

/**
 * Envia mensagem do cliente durante horário comercial (para atendente humano)
 */
export async function sendCustomerMessage(
  sessionId: string,
  message: string,
  customerName?: string,
  location?: string,
): Promise<ChatMessageDocument> {
  return ChatMessageModel.create({
    sessionId,
    sender: 'CUSTOMER',
    message,
    customerName,
    location,
  });
}

/**
 * Envia resposta do admin
 */
export async function sendAdminMessage(
  sessionId: string,
  message: string,
  adminId: string,
): Promise<ChatMessageDocument> {
  return ChatMessageModel.create({
    sessionId,
    sender: 'ADMIN',
    message,
    adminId,
  });
}

/**
 * Lista sessões ativas (com mensagens recentes)
 */
export async function getActiveSessions() {
  const sessions = await ChatMessageModel.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$sessionId',
        lastMessage: { $first: '$message' },
        lastSender: { $first: '$sender' },
        lastAt: { $first: '$createdAt' },
        customerName: { $first: '$customerName' },
        location: { $first: '$location' },
        closed: { $first: '$closed' },
        messageCount: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ['$sender', 'CUSTOMER'] }, 1, 0] },
        },
      },
    },
    { $match: { closed: { $ne: true } } },
    { $sort: { lastAt: -1 } },
    { $limit: 50 },
  ]);

  return sessions;
}

/**
 * Busca mensagens de uma sessão
 */
export async function getSessionMessages(sessionId: string) {
  return ChatMessageModel.find({ sessionId })
    .sort({ createdAt: 1 })
    .lean();
}

/**
 * Fecha/encerra uma sessão de chat
 */
export async function closeSession(sessionId: string) {
  await ChatMessageModel.updateMany(
    { sessionId },
    { $set: { closed: true } },
  );
}
