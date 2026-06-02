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
};
