import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Estado do saldo: cor e rótulo do "baixo/sem estoque".
function saldoInfo(saldo) {
  if (saldo == null) return { color: 'var(--ink-faint,#94a3b8)', badge: null };
  if (saldo <= 0) return { color: '#c0322b', badge: { txt: 'sem estoque', bg: '#ffe5e5', fg: '#c0322b' } };
  if (saldo <= 3) return { color: '#92590b', badge: { txt: 'baixo', bg: '#fdf3da', fg: '#92590b' } };
  return { color: 'var(--ink)', badge: null };
}

export function Filamentos({ onBack }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [saldoStatus, setSaldoStatus] = useState(200);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // busca no Bling para adicionar
  const [q, setQ] = useState('');
  const [sug, setSug] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  // ação aberta num card: { id, type: 'entrada'|'balanco', qty, custo }
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);

  function applyResp(r) { setItems(r.filamentos || []); if (r.saldoStatus != null) setSaldoStatus(r.saldoStatus); }

  function load() {
    setLoading(true);
    api.blingFilamentos().then(applyResp).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

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
    try { const r = await api.blingFilamentoAdd(item.id); applyResp(r); toast('Filamento adicionado'); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function remove(it) {
    try { const r = await api.blingFilamentoRemover(it.id); applyResp(r); }
    catch (e) { toast(e.message, 'err'); }
  }

  function openEntrada(it) { setAction({ id: it.id, type: 'entrada', qty: 1, custo: '' }); }
  function openBalanco(it) { setAction({ id: it.id, type: 'balanco', qty: Math.max(0, Number(it.saldo) || 0) }); }
  function closeAction() { setAction(null); }

  async function confirmAction(it) {
    const qty = Math.max(0, Number(action.qty) || 0);
    setSaving(true);
    try {
      const r = action.type === 'entrada'
        ? await api.blingFilamentoEntrada({ id: it.id, quantidade: qty, custo: action.custo })
        : await api.blingFilamentoBalanco({ id: it.id, quantidade: qty });
      applyResp(r);
      toast(action.type === 'entrada' ? `Entrada de ${qty} lançada no Bling` : `Saldo ajustado para ${qty} no Bling`);
      setAction(null);
    } catch (e) { toast(e.message, 'err'); }
    finally { setSaving(false); }
  }

  const list = (items || []).filter((i) => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    return (i.nome || '').toLowerCase().includes(f) || (i.sku || '').toLowerCase().includes(f);
  });

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Estoque de Filamentos</h1>
          <p>Saldo atual direto do Bling. Registre a chegada de material com <b>Entrada</b> ou acerte o total contado com <b>Balanço</b>.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading} title="Atualizar saldos"><Ic name="refresh" />{loading ? 'Atualizando…' : 'Atualizar'}</button>
      </div>

      {/* Busca / filtro no topo */}
      <div className="field" style={{ marginBottom: 12 }}>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar filamento por nome ou SKU…"
          style={{ fontSize: 16, height: 46 }} />
      </div>

      {/* Adicionar filamento (busca no Bling) */}
      <div className="field" style={{ position: 'relative', marginBottom: 16, maxWidth: 460 }}>
        <label>Adicionar filamento <span style={{ color: 'var(--ink-faint,#94a3b8)' }}>(busca no Bling)</span></label>
        <input value={q} onChange={(e) => search(e.target.value)}
          onFocus={() => { if (sug.length) setShowSug(true); }}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Digite o nome do filamento…" autoComplete="off" />
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

      {!error && saldoStatus !== 200 && (
        <div className="panel" style={{ padding: '12px 14px', marginBottom: 12, borderColor: '#e0b4b4', background: 'rgba(192,50,43,.06)', fontSize: 13.5 }}>
          <b>O Bling recusou a leitura de saldo (status {saldoStatus}).</b>{' '}
          {saldoStatus === 403
            ? 'Provavelmente o app não tem permissão de estoque. No cadastro do app no Bling, habilite “Controle de Estoque” e “Depósitos de Estoque” e reconecte (botão Reconectar no painel).'
            : 'Verifique a conexão com o Bling e tente Atualizar.'}
        </div>
      )}

      {items && items.length === 0 && !error && (
        <div className="empty"><div className="ic"><Ic name="layers" /></div><h3>Nenhum filamento na lista</h3><p>Adicione filamentos buscando no Bling acima. O saldo é lido direto do Bling.</p></div>
      )}

      {list.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {list.map((it) => {
            const si = saldoInfo(it.saldo);
            const open = action && action.id === it.id;
            return (
              <div key={it.id} className="panel" style={{ padding: 14, borderColor: it.saldo != null && it.saldo <= 0 ? 'var(--danger,#e0b4b4)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--surface-2,#f1f3f8)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {it.image ? <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Ic name="layers" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{it.nome}</span>
                      {si.badge && <span style={{ background: si.badge.bg, color: si.badge.fg, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{si.badge.txt}</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>{it.sku || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>saldo</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: si.color }}>
                      {it.saldo == null ? '—' : it.saldo} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)' }}>rolos</span>
                    </div>
                  </div>
                </div>

                {!open && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-soft btn-sm" style={{ height: 38 }} onClick={() => openEntrada(it)}><Ic name="plus" />Entrada</button>
                    <button className="btn btn-ghost btn-sm" style={{ height: 38 }} onClick={() => openBalanco(it)}><Ic name="tag" />Balanço</button>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost btn-sm" title="Remover da lista" onClick={() => remove(it)}><Ic name="trash" /></button>
                  </div>
                )}

                {open && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
                      {action.type === 'entrada' ? 'Registrar entrada — quanto chegou' : 'Balanço — total contado agora'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost" style={{ width: 44, height: 44, padding: 0, fontSize: 20 }} onClick={() => setAction((a) => ({ ...a, qty: Math.max(0, (Number(a.qty) || 0) - 1) }))}>−</button>
                      <input type="number" value={action.qty}
                        onChange={(e) => setAction((a) => ({ ...a, qty: parseInt(e.target.value, 10) || 0 }))}
                        style={{ width: 84, height: 44, textAlign: 'center', fontSize: 18, border: '1px solid var(--line)', borderRadius: 8 }} />
                      <button className="btn btn-ghost" style={{ width: 44, height: 44, padding: 0, fontSize: 20 }} onClick={() => setAction((a) => ({ ...a, qty: (Number(a.qty) || 0) + 1 }))}>+</button>
                      <span style={{ color: 'var(--ink-soft)' }}>rolos</span>
                    </div>

                    {action.type === 'entrada' && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>custo un. (opcional)</span>
                        <input type="number" value={action.custo} placeholder="0,00"
                          onChange={(e) => setAction((a) => ({ ...a, custo: e.target.value }))}
                          style={{ width: 100, height: 36, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 6 }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn btn-primary" style={{ height: 44 }} disabled={saving} onClick={() => confirmAction(it)}>
                        <Ic name="check" />{saving ? 'Salvando…' : (action.type === 'entrada' ? 'Confirmar entrada' : 'Confirmar balanço')}
                      </button>
                      <button className="btn btn-ghost" style={{ height: 44 }} disabled={saving} onClick={closeAction}>Cancelar</button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint,#94a3b8)', marginTop: 8 }}>Grava no Bling e atualiza o saldo.</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
