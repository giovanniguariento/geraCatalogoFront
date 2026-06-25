import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const PRIO = {
  Alta: { bg: '#ffe5e5', fg: '#c0322b', dot: '🔴' },
  'Média': { bg: '#fdf3da', fg: '#92590b', dot: '🟡' },
  Baixa: { bg: '#e1f5ea', fg: '#15803d', dot: '🟢' },
};
const MP = {
  meli: { bg: '#fff7d6', fg: '#8a7400', icon: '🛒' },
  amazon: { bg: '#fff0db', fg: '#b35900', icon: '📦' },
  shopee: { bg: '#ffe9e3', fg: '#d23f1d', icon: '🧡' },
  tiktok: { bg: '#eef0f3', fg: '#111827', icon: '🎵' },
  direct: { bg: '#e6f0ff', fg: '#1c47b8', icon: '🏪' },
  other: { bg: '#eef1f4', fg: '#64748b', icon: '🌐' },
};
const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtSync = (iso) => { if (!iso) return null; const d = new Date(iso); return isNaN(d) ? null : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
const mp = (id) => MP[id] || MP.other;
const prio = (p) => PRIO[p] || PRIO.Baixa;

function Pill({ bg, fg, children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color: fg, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function Fila() {
  const [items, setItems] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ sku: '', productName: '', quantity: 1, price: 0, orderId: '' });
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [sug, setSug] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const [showImport, setShowImport] = useState(false);
  const [impQueue, setImpQueue] = useState('');
  const [impProc, setImpProc] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => { api.blingFila().then((r) => { setItems(r.fila || []); setLastSync(r.lastSync || null); }).catch((e) => setError(e.message)); }, []);

  // Polling de 2 min: mantém a tela em sincronia com outras telas/operadores
  // (não atualiza enquanto está buscando no Bling ou com o modal aberto).
  const busy = useRef({ loading: false, modal: false });
  busy.current.loading = loading; busy.current.modal = modal;
  useEffect(() => {
    const t = setInterval(async () => {
      if (busy.current.loading || busy.current.modal) return;
      try { const r = await api.blingFila(); setItems(r.fila || []); if (r.lastSync) setLastSync(r.lastSync); } catch {}
    }, 120000);
    return () => clearInterval(t);
  }, []);

  async function atualizar() {
    setLoading(true); setError(null);
    try { const r = await api.blingFilaAtualizar(); setItems(r.fila || []); if (r.lastSync) setLastSync(r.lastSync); toast('Fila atualizada'); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function setPrinted(item, value) {
    const printed = Math.max(0, value);
    setItems((arr) => arr.map((i) => i.sku === item.sku ? { ...i, printed, remaining: Math.max(0, i.quantity - printed) } : i));
    try { const r = await api.blingFilaImpresso(item.sku, printed); setItems(r.fila || []); }
    catch (e) { toast(e.message, 'err'); }
  }

  function searchBling(v) {
    setForm((f) => ({ ...f, productName: v }));
    if (searchRef.current) clearTimeout(searchRef.current);
    const q = v.trim();
    if (q.length < 3) { setSug([]); setShowSug(false); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await api.blingSearch(q);
        if (res && res.connected) { setSug(res.items || []); setShowSug(true); }
        else { setSug([]); setShowSug(false); }
      } catch { setSug([]); setShowSug(false); }
      finally { setSearching(false); }
    }, 350);
  }

  function pickProduct(item) {
    setShowSug(false); setSug([]);
    setForm((f) => ({
      ...f,
      productName: item.nome || f.productName,
      sku: item.codigo || f.sku,
      price: item.preco || f.price,
    }));
  }

  async function salvarManual() {
    if (!form.sku.trim() || !form.productName.trim() || !form.quantity || !form.price) {
      setModalErr('SKU, nome, quantidade e preço são obrigatórios.'); return;
    }
    setSaving(true); setModalErr('');
    try {
      const r = await api.blingFilaManual({ ...form, quantity: Number(form.quantity), price: Number(form.price) });
      setItems(r.fila || []); setModal(false); toast('Item adicionado à fila');
    } catch (e) { setModalErr(e.message); }
    finally { setSaving(false); }
  }

  async function remover(item) {
    if (!window.confirm(`Remover "${item.productName || item.sku}" da fila?`)) return;
    try { const r = await api.blingFilaRemover(item.sku); setItems(r.fila || []); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function importar() {
    let queue, processed;
    try { queue = JSON.parse(impQueue); } catch { toast('JSON da fila inválido', 'err'); return; }
    try { processed = impProc.trim() ? JSON.parse(impProc) : []; } catch { toast('JSON de pedidos concluídos inválido', 'err'); return; }
    setImporting(true);
    try {
      const r = await api.blingFilaImportar(queue, processed);
      toast(`Importado: ${r.itensImportados} itens, ${r.pedidosConcluidos} pedidos concluídos`);
      setShowImport(false); setImpQueue(''); setImpProc('');
      const f = await api.blingFila(); setItems(f.fila || []);
    } catch (e) { toast(e.message, 'err'); }
    finally { setImporting(false); }
  }

  const pendentes = (items || []).filter((i) => i.remaining > 0).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fila de impressão</h1>
          <p>Pedidos em aberto · sem estoque sobe na fila, com estoque vira reposição.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {lastSync && (
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }} title="Horário da última busca no Bling">
              Última consulta: {fmtSync(lastSync)}
            </span>
          )}
          <button className="btn btn-soft btn-sm" onClick={() => { setForm({ sku: '', productName: '', quantity: 1, price: 0, orderId: '' }); setSug([]); setShowSug(false); setModalErr(''); setModal(true); }}>
            <Ic name="plus" />Adicionar
          </button>
          <button className="btn btn-primary btn-sm" onClick={atualizar} disabled={loading}>
            <Ic name="link" />{loading ? 'Buscando…' : 'Atualizar fila'}
          </button>
        </div>
      </div>

      {items && items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '4px 0 16px', fontSize: 13, color: 'var(--ink-soft)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-faint,#94a3b8)' }}>Criticidade</span>
          <Pill bg={PRIO.Alta.bg} fg={PRIO.Alta.fg}>🔴 Alta</Pill>
          <Pill bg={PRIO['Média'].bg} fg={PRIO['Média'].fg}>🟡 Média</Pill>
          <Pill bg={PRIO.Baixa.bg} fg={PRIO.Baixa.fg}>🟢 Baixa</Pill>
          <span style={{ width: 1, height: 14, background: 'var(--line)', margin: '0 2px' }} />
          <Pill bg="#fde2e1" fg="#c0322b">⚠ Sem estoque</Pill>
          <Pill bg="#e1f5ea" fg="#15803d">✔ Reposição</Pill>
          <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{items.length} item(ns) · {pendentes} pendente(s)</span>
        </div>
      )}

      {loading && (!items || !items.length) && (
        <div className="empty"><div className="ic"><Ic name="layers" /></div><h3>Consultando pedidos no Bling…</h3><p>Isso pode levar um pouco na primeira vez.</p></div>
      )}

      {error && (
        <div className="empty"><div className="ic"><Ic name="x" /></div><h3>Não foi possível carregar</h3><p>{error}</p></div>
      )}

      {items && items.length === 0 && !loading && !error && (
        <div className="empty"><div className="ic"><Ic name="check" /></div><h3>Fila vazia</h3><p>Nenhum produto para imprimir no momento. Clique em "Atualizar fila" para buscar no Bling.</p></div>
      )}

      {items && items.length > 0 && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                {['#', 'Criticidade', 'Produto', 'SKU', 'Canal', 'Total', 'Estoque', 'Já impresso', 'Faltam', 'Valor un.', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const pc = prio(it.priority);
                const pct = it.quantity ? Math.round((it.printed / it.quantity) * 100) : 0;
                const first = idx === 0 && it.remaining > 0;
                return (
                  <tr key={it.sku} style={{ borderTop: '1px solid var(--line)', background: first ? 'rgba(35,88,230,.04)' : it.manual ? 'rgba(163,113,247,.05)' : 'transparent' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-3,#eef1f6)', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}><Pill bg={pc.bg} fg={pc.fg}>{pc.dot} {it.priority}</Pill></td>
                    <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                      <div style={{ fontWeight: 600 }}>{it.productName}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        {it.semEstoque && <span style={{ fontSize: 11, color: '#c0322b', fontWeight: 600 }}>⚠ sem estoque</span>}
                        {it.reposicao && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>✔ reposição</span>}
                        {it.manual && <span style={{ fontSize: 11, color: '#7c3aed' }}>✏️ Manual</span>}
                        {first && !it.manual && <span style={{ fontSize: 11, color: 'var(--blue)' }}>✦ Próximo</span>}
                        {it.orderId && <span style={{ fontSize: 11, color: 'var(--ink-faint,#94a3b8)' }}>#{it.orderId}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12 }}>{it.sku}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(it.marketplaces || []).map((m, i) => { const c = mp(m.id); return <Pill key={i} bg={c.bg} fg={c.fg}>{c.icon} {m.label}</Pill>; })}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{it.quantity}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {it.stock == null
                        ? <span style={{ color: 'var(--ink-faint,#94a3b8)' }} title="Não cadastrado na aba Estoque">—</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: it.semEstoque ? '#c0322b' : 'var(--ink-soft)' }} title="Saldo atual (cai quando entra pedido, volta quando imprime)"><Ic name="tag" />{it.stock < 0 ? `falta ${-it.stock}` : `${it.stock} un`}</span>}
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 9px' }} disabled={it.printed === 0} onClick={() => setPrinted(it, it.printed - 1)}>−</button>
                        <input type="number" min="0" value={it.printed}
                          onChange={(e) => setPrinted(it, parseInt(e.target.value, 10) || 0)}
                          style={{ width: 52, textAlign: 'center', padding: '4px', border: '1px solid var(--line)', borderRadius: 6 }} />
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 9px' }} onClick={() => setPrinted(it, it.printed + 1)}>+</button>
                      </div>
                      <div style={{ height: 4, background: 'var(--surface-3,#eef1f6)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: 'var(--blue)' }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 15 }}>{it.remaining}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: pc.fg, whiteSpace: 'nowrap' }}>{fmtBRL(it.price)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button className="btn btn-ghost btn-sm" title="Remover da fila" onClick={() => remover(it)}><Ic name="trash" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Importar dados antigos (one-time) */}
      <div style={{ marginTop: 22 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowImport((s) => !s)}>
          <Ic name="up" />{showImport ? 'Fechar importação' : 'Importar dados antigos'}
        </button>
        {showImport && (
          <div className="panel" style={{ padding: 18, marginTop: 12 }}>
            <p className="hint" style={{ marginTop: 0 }}>Cole os dumps do Redis uma única vez. <b>Fila</b> = o mapa por SKU; <b>Concluídos</b> = a lista de números de pedido já impressos. SKU vazio e filamentos (PL/PG) são ignorados na importação.</p>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Fila (JSON do mapa por SKU)</label>
              <textarea value={impQueue} onChange={(e) => setImpQueue(e.target.value)} rows={5} placeholder='{ "B3D-...": { ... } }' style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 12 }} />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Pedidos concluídos (JSON array — opcional)</label>
              <textarea value={impProc} onChange={(e) => setImpProc(e.target.value)} rows={3} placeholder='["35148", "36420", ...]' style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 12 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={importar} disabled={importing}>{importing ? 'Importando…' : 'Importar'}</button>
          </div>
        )}
      </div>

      {/* Modal adicionar manual */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} className="panel" style={{ width: 'min(480px,100%)', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>✏️ Adicionar produto à fila</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}><Ic name="x" /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field" style={{ position: 'relative' }}>
                <label>Produto <span style={{ color: 'var(--ink-faint,#94a3b8)' }}>(busca no Bling)</span></label>
                <input value={form.productName}
                  onChange={(e) => searchBling(e.target.value)}
                  onFocus={() => { if (sug.length) setShowSug(true); }}
                  onBlur={() => setTimeout(() => setShowSug(false), 150)}
                  placeholder="Digite o nome para buscar…" autoComplete="off" />
                {searching && <span className="ac-hint"><span className="ac-spin" /> buscando no Bling…</span>}
                {showSug && sug.length > 0 && (
                  <div className="ac-list">
                    {sug.map((s) => (
                      <div key={s.id} className="ac-item" onMouseDown={(e) => { e.preventDefault(); pickProduct(s); }}>
                        <span className="nm">{s.nome}</span>
                        <span className="meta">{s.codigo} · {fmtBRL(s.preco)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="field"><label>SKU *</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex.: B3D-001" /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="field" style={{ flex: 1 }}><label>Quantidade *</label><input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}><label>Preço un. (R$) *</label><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              </div>
              <div className="field"><label>Nº Pedido <span style={{ color: 'var(--ink-faint,#94a3b8)' }}>(opcional)</span></label><input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} placeholder="Ex.: 27292" /></div>
              {modalErr && <p className="hint" style={{ color: 'var(--warn,#b45309)' }}>⚠ {modalErr}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarManual} disabled={saving}>{saving ? 'Salvando…' : 'Adicionar à fila'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
