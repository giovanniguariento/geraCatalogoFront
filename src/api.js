const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const KEY = import.meta.env.VITE_API_KEY || '';

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (KEY) headers['x-api-key'] = KEY;
  const r = await fetch(BASE + '/api' + path, { ...opts, headers });
  if (!r.ok) {
    let msg = 'Erro ' + r.status;
    try { const j = await r.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  if (r.status === 204) return null;
  return r.json();
}

export const api = {
  base: BASE,
  listCatalogs: () => req('/catalogs'),
  getCatalog: (id) => req('/catalogs/' + id),
  createCatalog: () => req('/catalogs', { method: 'POST', body: '{}' }),
  updateCatalog: (id, data) => req('/catalogs/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCatalog: (id) => req('/catalogs/' + id, { method: 'DELETE' }),
  duplicateCatalog: (id) => req('/catalogs/' + id + '/duplicate', { method: 'POST', body: '{}' }),
  addPage: (id, data) => req('/catalogs/' + id + '/pages', { method: 'POST', body: JSON.stringify(data) }),
  updatePage: (id, data) => req('/pages/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deletePage: (id) => req('/pages/' + id, { method: 'DELETE' }),
  reorder: (id, order) => req('/catalogs/' + id + '/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
  // Bling (opcional)
  blingStatus: () => req('/bling/status'),
  blingSearch: (q) => req('/bling/produtos?q=' + encodeURIComponent(q)),
  blingProduct: (id) => req('/bling/produtos/' + encodeURIComponent(id)),
  // OAuth é navegação de página inteira (fora de /api); volta pro app via ?bling=
  blingConnectUrl: () => BASE + '/bling/connect?return=' +
    encodeURIComponent(window.location.origin + window.location.pathname),
  blingReportStart: (ano, mes, fornecedor) =>
    req('/bling/relatorio/peso-fornecedor/iniciar?ano=' + ano + '&mes=' + mes + '&fornecedor=' + encodeURIComponent(fornecedor)),
  blingReportStatus: (jobId) =>
    req('/bling/relatorio/peso-fornecedor/status?jobId=' + encodeURIComponent(jobId)),
  // Fila de impressão
  blingFila: () => req('/bling/fila'),
  blingFilaAtualizar: () => req('/bling/fila/atualizar', { method: 'POST', body: '{}' }),
  blingFilaImpresso: (sku, printed) => req('/bling/fila/impresso', { method: 'POST', body: JSON.stringify({ sku, printed }) }),
  blingFilaManual: (form) => req('/bling/fila/manual', { method: 'POST', body: JSON.stringify(form) }),
  blingFilaRemover: (sku) => req('/bling/fila/remover', { method: 'POST', body: JSON.stringify({ sku }) }),
  blingFilaImportar: (queue, processed) => req('/bling/fila/importar', { method: 'POST', body: JSON.stringify({ queue, processed }) }),
  // Conversor ZPL -> PDF
  zplCount: (zpl) => req('/zpl/contar', { method: 'POST', body: JSON.stringify({ zpl }) }),
  zplConvert: async ({ zpl, dpmm, width, height, rotation }) => {
    const headers = { 'Content-Type': 'application/json' };
    if (KEY) headers['x-api-key'] = KEY;
    const r = await fetch(BASE + '/api/zpl/converter', {
      method: 'POST', headers, body: JSON.stringify({ zpl, dpmm, width, height, rotation }),
    });
    if (!r.ok) { let m = 'Erro ' + r.status; try { const j = await r.json(); m = j.error || m; } catch {} throw new Error(m); }
    return { blob: await r.blob(), count: r.headers.get('X-Label-Count') };
  },
  zplPreview: async ({ zpl, dpmm, width, height, rotation, index }) => {
    const headers = { 'Content-Type': 'application/json' };
    if (KEY) headers['x-api-key'] = KEY;
    const r = await fetch(BASE + '/api/zpl/preview', {
      method: 'POST', headers, body: JSON.stringify({ zpl, dpmm, width, height, rotation, index }),
    });
    if (!r.ok) { let m = 'Erro ' + r.status; try { const j = await r.json(); m = j.error || m; } catch {} throw new Error(m); }
    return { url: URL.createObjectURL(await r.blob()), total: Number(r.headers.get('X-Label-Total')) || 1, index: Number(r.headers.get('X-Label-Index')) || 0 };
  },
};
