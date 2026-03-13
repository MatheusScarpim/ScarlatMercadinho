import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import * as chat from '../controllers/chatController';

const router = Router();

// ── Endpoints públicos (kiosk) ──
router.get('/faq', chat.faq);
router.get('/status', chat.status);
router.post('/send', chat.send);
router.get('/messages/:sessionId', chat.messages);

// ── Endpoints admin (requerem auth) ──
router.get('/sessions', authMiddleware, chat.sessions);
router.post('/reply', authMiddleware, chat.reply);
router.post('/close', authMiddleware, chat.close);

export default router;
