import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR'); };

export function Estoque() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [sug, setSug] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { api.blingEstoque().then((r) => setItems(r.estoque || [])).catch((e) => setError(e.message)); }, []);

  function search(v) {
    setQ(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    const term = v.trim();
    if (term.length < 3) { setSug([]); setShowSug(false); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await api.blingSearch(term);
        if (res && res.connected) { setSug(res.items || []); setShowSug(true); }
        else { setSug([]); setShowSug(false); }
      } catch { setSug([]); setShowSug(false); }
      finally { setSearching(false); }
    }, 350);
  }

  async function add(item) {
    setShowSug(false); setSug([]); setQ('');
    try {
      const r = await api.blingEstoqueSet({ sku: item.codigo || String(item.id), productName: item.nome, stock: 0 });
      setItems(r.estoque || []); toast('Produto adicionado ao estoque');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function setStock(it, value) {
    const stock = Math.max(0, value);
    setItems((arr) => arr.map((i) => i.sku === it.sku ? { ...i, stock } : i));
    try { const r = await api.blingEstoqueSet({ sku: it.sku, productName: it.productName, stock }); setItems(r.estoque || []); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function remove(it) {
    if (!window.confirm(`Remover "${it.productName || it.sku}" do estoque?`)) return;
    try { const r = await api.blingEstoqueRemover(it.sku); setItems(r.estoque || []); }
    catch (e) { toast(e.message, 'err'); }
  }

  const list = (items || []).filter((i) => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    return (i.productName || '').toLowerCase().includes(f) || (i.sku || '').toLowerCase().includes(f);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estoque</h1>
          <p>Quantidade em mãos por produto. A fila usa isso para definir a prioridade.</p>
        </div>
      </div>

      <div className="field" style={{ position: 'relative', marginBottom: 16, maxWidth: 460 }}>
        <label>Adicionar produto <span style={{ color: 'var(--ink-faint,#94a3b8)' }}>(busca no Bling)</span></label>
        <input value={q} onChange={(e) => search(e.target.value)}
          onFocus={() => { if (sug.length) setShowSug(true); }}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Digite o nome do produto…" autoComplete="off" />
        {searching && <span className="ac-hint"><span className="ac-spin" /> buscando no Bling…</span>}
        {showSug && sug.length > 0 && (
          <div className="ac-list">
            {sug.map((s) => (
              <div key={s.id} className="ac-item" onMouseDown={(e) => { e.preventDefault(); add(s); }}>
                <span className="nm">{s.nome}</span>
                <span className="meta">{s.codigo} · {fmtBRL(s.preco)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="empty"><div className="ic"><Ic name="x" /></div><h3>Não foi possível carregar</h3><p>{error}</p></div>}

      {items && items.length === 0 && !error && (
        <div className="empty"><div className="ic"><Ic name="layers" /></div><h3>Nenhum produto no estoque</h3><p>Adicione produtos buscando no Bling acima. A fila vai usar esse estoque para priorizar.</p></div>
      )}

      {items && items.length > 0 && (
        <>
          <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar por nome ou SKU…" />
          </div>
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                  {['Produto', 'SKU', 'Em estoque', 'Atualizado', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((it) => (
                  <tr key={it.sku} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 300 }}>{it.productName}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12 }}>{it.sku}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 9px' }} disabled={(it.stock || 0) === 0} onClick={() => setStock(it, (it.stock || 0) - 1)}>−</button>
                        <input type="number" min="0" value={it.stock || 0}
                          onChange={(e) => setStock(it, parseInt(e.target.value, 10) || 0)}
                          style={{ width: 56, textAlign: 'center', padding: '4px', border: '1px solid var(--line)', borderRadius: 6 }} />
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 9px' }} onClick={() => setStock(it, (it.stock || 0) + 1)}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-soft)' }}>{fmtDate(it.updatedAt)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button className="btn btn-ghost btn-sm" title="Remover do estoque" onClick={() => remove(it)}><Ic name="trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
