import { Request, Response } from 'express';
import { startRefresh, getRefreshStatus, abortRefresh, subscribeRefresh } from '../services/refreshService';

// POST /api/products/refresh
// body: { forceAll?: boolean }
export async function triggerRefresh(req: Request, res: Response) {
  const status = getRefreshStatus();
  if (status.running) {
    return res.status(409).json({ message: 'Refresh já está em andamento', status });
  }

  const forceAll = req.body?.forceAll === true;

  // Inicia em background (não bloqueia a request)
  startRefresh(forceAll).catch((err) => {
    console.error('[REFRESH] Erro no job:', err?.message);
  });

  res.json({ message: 'Refresh iniciado', forceAll });
}

// GET /api/products/refresh/status
export async function refreshStatus(_req: Request, res: Response) {
  res.json(getRefreshStatus());
}

// POST /api/products/refresh/abort
export async function refreshAbort(_req: Request, res: Response) {
  const aborted = abortRefresh();
  if (aborted) {
    res.json({ message: 'Cancelamento solicitado' });
  } else {
    res.json({ message: 'Nenhum refresh em andamento' });
  }
}

// GET /api/products/refresh/stream (SSE - acompanhar em tempo real)
export async function refreshStream(_req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Manda status atual imediatamente
  send('status', getRefreshStatus());

  const unsubscribe = subscribeRefresh((event, data) => {
    send(event, data);
    if (event === 'done') {
      res.end();
    }
  });

  _req.on('close', () => {
    unsubscribe();
  });
}
