import { Request, Response } from 'express';
import { LocationModel } from '../models/Location';

// Marca um local específico para recarregar
export async function requestReload(req: Request, res: Response) {
  const location = await LocationModel.findByIdAndUpdate(
    req.params.id,
    { reloadRequested: true },
    { new: true }
  );
  if (!location) return res.status(404).json({ message: 'Local não encontrado' });
  res.json({ message: `Reload solicitado para "${location.name}"` });
}

// Marca todos os locais ativos para recarregar
export async function requestReloadAll(_req: Request, res: Response) {
  const result = await LocationModel.updateMany(
    { active: true },
    { reloadRequested: true }
  );
  res.json({ message: `Reload solicitado para ${result.modifiedCount} locais` });
}

// O kiosk chama essa rota para verificar se precisa recarregar (polling)
export async function checkReload(req: Request, res: Response) {
  const code = req.params.code?.toUpperCase();
  const location = await LocationModel.findOne({ code });
  if (!location) return res.json({ reload: false });

  if (location.reloadRequested) {
    await LocationModel.updateOne({ _id: location._id }, { reloadRequested: false });
    return res.json({ reload: true });
  }

  res.json({ reload: false });
}

// Retorna um script JS que o kiosk carrega via <script src>
// Faz polling direto no browser sem depender do código Vue
export async function reloadScript(_req: Request, res: Response) {
  const script = `
(function() {
  var POLL_INTERVAL = 10000;
  function getLocation() {
    try { return localStorage.getItem('kioskLocation') || 'central'; } catch(e) { return 'central'; }
  }
  function getApiBase() {
    try {
      var m = document.querySelector('meta[name="api-base"]');
      if (m) return m.getAttribute('content');
    } catch(e) {}
    return '';
  }
  function checkReload() {
    var loc = getLocation();
    var base = getApiBase();
    var url = (base || window.__API_BASE__ || '') + '/kiosks/check-reload/' + loc;
    fetch(url).then(function(r) { return r.json(); }).then(function(data) {
      if (data.reload) {
        document.body.innerHTML = '<div style="position:fixed;inset:0;background:#f6f8fb;display:flex;align-items:center;justify-content:center;z-index:999999;font-family:sans-serif"><div style="text-align:center"><div style="width:56px;height:56px;border:4px solid #e0e0e0;border-top-color:#4f46e5;border-radius:50%;margin:0 auto 24px;animation:kspin .8s linear infinite"></div><h2 style="font-size:1.5rem;margin-bottom:8px">Atualizando...</h2><p style="color:#6b7280">O sistema está sendo atualizado, aguarde.</p></div></div><style>@keyframes kspin{to{transform:rotate(360deg)}}</style>';
        setTimeout(function() { window.location.reload(); }, 2000);
      }
    }).catch(function() {});
  }
  setInterval(checkReload, POLL_INTERVAL);
  checkReload();
})();
`;
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(script);
}
