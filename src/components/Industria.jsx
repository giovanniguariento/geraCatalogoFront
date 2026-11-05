import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const fmtKg = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const NIVEL = {
  critico: { bg: '#ffe5e5', fg: '#c0322b', txt: 'crítico' },
  alta: { bg: '#ffe5e5', fg: '#c0322b', txt: 'alta' },
  media: { bg: '#fdf3da', fg: '#92590b', txt: 'média' },
  limite: { bg: '#fdf3da', fg: '#92590b', txt: 'no limite' },
  ok: { bg: '#e1f5ea', fg: '#15803d', txt: 'ok' },
};
const compVazio = () => ({ nome: '', pct: '' });

export function Industria({ onBack, can, isAdmin }) {
  const podeProd = isAdmin || (can && can('industria'));
  const podeCom = isAdmin || (can && can('industria_comercial'));
  const tabs = [
    podeProd && { id: 'fila', label: 'Fila de produção' },
    podeProd && { id: 'cores', label: 'Cores' },
    (podeCom || podeProd) && { id: 'prioridade', label: 'Prioridade · comercial' },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0] ? tabs[0].id : 'prioridade');
  const [bling, setBling] = useState(null);

  useEffect(() => { api.indStatus().then(setBling).catch(() => setBling(null)); }, []);

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Indústria de Filamentos</h1>
          <p>Fila de produção pelo estoque do Bling Indústria, com receitas e prioridade do comercial.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {bling && bling.connected && <span className="bling-badge"><Ic name="check" />Bling Indústria conectado</span>}
          {bling && bling.configured && (
            <button className="btn btn-ghost btn-sm" onClick={() => { window.location.href = api.indConnectUrl(); }}>
              <Ic name="link" />{bling.connected ? 'Reconectar' : 'Conectar Bling Indústria'}
            </button>
          )}
        </div>
      </div>

      {bling && bling.configured && !bling.connected && (
        <div className="panel" style={{ padding: '12px 14px', marginBottom: 14, borderColor: '#e0b4b4', background: 'rgba(192,50,43,.06)', fontSize: 13.5 }}>
          O Bling da Indústria ainda não está conectado. Clique em <b>Conectar Bling Indústria</b> pra o módulo ler os saldos.
        </div>
      )}

      <div className="seg" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 14px', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.id ? 'var(--ink)' : 'var(--ink-soft)', borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fila' && <Fila />}
      {tab === 'cores' && <Cores />}
      {tab === 'prioridade' && <Prioridade />}
    </>
  );
}

// ---------------- Fila ----------------
function Fila() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [iniciando, setIniciando] = useState(null); // {corId, qtd}
  const [finalizando, setFinalizando] = useState(null); // {prodId, total}

  function load() { setLoading(true); api.indFila().then(setData).catch((e) => toast(e.message, 'err')).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, []);

  async function confirmarIniciar(it) {
    const qtd = iniciando && iniciando.corId === it.id ? iniciando.qtd : it.produzir;
    try { const r = await api.indIniciar(it.id, { quantidade: qtd }); setData(r); setIniciando(null); toast('Produção iniciada'); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function confirmarFinalizar(p) {
    const total = finalizando && finalizando.prodId === p.id ? finalizando.total : p.planejado;
    try {
      const r = await api.indFinalizar(p.id, { produzido: total });
      setData(r.fila); setFinalizando(null);
      toast(r.lancado ? `Finalizado · ${fmtKg(r.total)} kg lançados no Bling` : `Finalizado, mas: ${r.lancamentoErro}`, r.lancado ? 'ok' : 'err');
    } catch (e) { toast(e.message, 'err'); }
  }

  if (!data) return <div className="panel" style={{ padding: 16 }}>{loading ? 'Carregando…' : '—'}</div>;
  const [prox, ...resto] = data.fila;

  return (
    <>
      {data.saldoStatus === 0 && (
        <div className="panel" style={{ padding: '10px 12px', marginBottom: 12, borderColor: '#e0b4b4', background: 'rgba(192,50,43,.06)', fontSize: 13 }}>
          Não consegui ler o saldo do Bling Indústria. Verifique a conexão (botão acima).
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="a produzir na fila" valor={`${fmtKg(data.totalKg)} kg`} />
        <Stat label="tempo estimado" valor={data.totalTempo} />
        <Stat label="capacidade" valor={`${fmtKg(data.capacidade)} kg/h`} />
        <button className="btn btn-ghost btn-sm" onClick={load} style={{ alignSelf: 'center' }}><Ic name="refresh" />Atualizar</button>
      </div>

      {/* Produções em andamento */}
      {data.emProducao.map((p) => (
        <div key={p.id} className="panel" style={{ padding: 14, marginBottom: 10, borderColor: 'var(--blue)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 8 }}>Em produção · planejado {fmtKg(p.planejado)} kg</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <b style={{ flex: 1 }}>{p.corNome}</b>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Total produzido</span>
            <input type="text" inputMode="decimal"
              value={finalizando && finalizando.prodId === p.id ? finalizando.total : p.planejado}
              onChange={(e) => setFinalizando({ prodId: p.id, total: e.target.value })}
              style={{ width: 80, height: 40, textAlign: 'center', border: '1px solid var(--line-strong)', borderRadius: 8 }} />
            <span style={{ color: 'var(--ink-soft)' }}>kg</span>
            <button className="btn btn-primary btn-sm" onClick={() => confirmarFinalizar(p)}><Ic name="check" />Finalizar e lançar no Bling</button>
            <button className="btn btn-ghost btn-sm" onClick={async () => { const r = await api.indCancelar(p.id); setData(r); }}>Cancelar</button>
          </div>
        </div>
      ))}

      {data.fila.length === 0 && data.emProducao.length === 0 && (
        <div className="empty"><div className="ic"><Ic name="check" /></div><h3>Nada na fila</h3><p>Todas as cores estão acima do mínimo. 🎉</p></div>
      )}

      {/* Próximo destacado */}
      {prox && <ItemFila it={prox} destaque iniciando={iniciando} setIniciando={setIniciando} onIniciar={confirmarIniciar} />}
      {resto.map((it) => <ItemFila key={it.id} it={it} iniciando={iniciando} setIniciando={setIniciando} onIniciar={confirmarIniciar} />)}

      {/* Cores ok (fora da fila) */}
      {data.ok.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>Abastecidas (fora da fila)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.ok.map((it) => (
              <span key={it.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '5px 10px', border: '1px solid var(--line)', borderRadius: 999, opacity: .7 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: it.hex }} />{it.nome}
                <span style={{ color: 'var(--ink-faint,#94a3b8)' }}>{it.temSaldo ? `${fmtKg(it.saldo)}/${fmtKg(it.minimo)}` : 's/ saldo'}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ItemFila({ it, destaque, iniciando, setIniciando, onIniciar }) {
  const n = NIVEL[it.nivelAuto] || NIVEL.ok;
  const aberto = iniciando && iniciando.corId === it.id;
  return (
    <div className="panel" style={{ padding: 14, marginBottom: 10, border: destaque ? '2px solid var(--blue)' : undefined }}>
      {destaque && <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, background: 'var(--blue-soft)', color: 'var(--blue)', padding: '3px 10px', borderRadius: 999 }}>Próximo a produzir</span>
        {it.saldo <= 0 && it.temSaldo && <span style={{ fontSize: 11, background: '#ffe5e5', color: '#c0322b', padding: '3px 10px', borderRadius: 999 }}>zerado</span>}
      </div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: it.hex, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 600 }}>{it.nome}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {it.temSaldo ? `${fmtKg(it.saldo)} / ${fmtKg(it.minimo)} kg` : 'sem saldo lido'}
            {it.produzir > 0 && <> · produzir {fmtKg(it.produzir)} kg · <Ic name="clock" />{it.tempo}</>}
          </div>
          {it.prioObs && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}><Ic name="edit" /> comercial: "{it.prioObs}"</div>}
        </div>
        <span style={{ fontSize: 11, background: n.bg, color: n.fg, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{it.prioridade !== 'normal' ? 'comercial ' + it.prioridade : n.txt}</span>
      </div>
      {!aberto ? (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setIniciando({ corId: it.id, qtd: it.produzir })}><Ic name="plus" />Iniciar produção</button>
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--surface-2,#f4f6fa)', padding: 10, borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Quanto vai produzir</span>
          <input type="text" inputMode="decimal" value={iniciando.qtd}
            onChange={(e) => setIniciando({ corId: it.id, qtd: e.target.value })}
            style={{ width: 80, height: 40, textAlign: 'center', border: '1px solid var(--line-strong)', borderRadius: 8 }} />
          <span style={{ color: 'var(--ink-soft)' }}>kg</span>
          <button className="btn btn-primary btn-sm" onClick={() => onIniciar(it)}><Ic name="check" />Iniciar</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setIniciando(null)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, valor }) {
  return (
    <div style={{ flex: 1, minWidth: 110, background: 'var(--surface-2,#f4f6fa)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{valor}</div>
    </div>
  );
}

// ---------------- Cores ----------------
function Cores() {
  const [cores, setCores] = useState(null);
  const [edit, setEdit] = useState(null); // objeto cor em edição (ou novo)
  function load() { api.indCores().then((r) => setCores(r.cores || [])).catch((e) => toast(e.message, 'err')); }
  useEffect(() => { load(); }, []);

  function novo() { setEdit({ nome: '', hex: '#888780', produtoId: null, sku: '', minimo: '', receita: [compVazio()] }); }

  if (edit) return <EditorCor cor={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={novo}><Ic name="plus" />Nova cor</button>
      </div>
      {cores && cores.length === 0 && <div className="empty"><div className="ic"><Ic name="layers" /></div><h3>Nenhuma cor</h3><p>Cadastre as cores com o mínimo e a receita de cada uma.</p></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
        {(cores || []).map((c) => (
          <button key={c.id} className="panel cli-card" onClick={() => setEdit({ ...c, receita: c.receita && c.receita.length ? c.receita : [compVazio()] })}
            style={{ padding: 14, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: c.hex, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>mín {fmtKg(c.minimo)} kg · {c.receita.length} comp.</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint,#94a3b8)', marginTop: 8 }}>{c.sku || (c.produtoId ? 'produto #' + c.produtoId : 'sem produto Bling')}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function EditorCor({ cor, onClose, onSaved }) {
  const [f, setF] = useState(cor);
  const [q, setQ] = useState(cor.sku || '');
  const [sug, setSug] = useState([]);
  const [busy, setBusy] = useState(false);
  const somaPct = (f.receita || []).reduce((s, c) => s + (Number(String(c.pct).replace(',', '.')) || 0), 0);
  const lote = Number(String(f.minimo).replace(',', '.')) || 1;

  async function buscar(v) {
    setQ(v);
    if (v.trim().length < 3) { setSug([]); return; }
    try { const r = await api.indProdutos(v); if (r.connected) setSug(r.items || []); } catch {}
  }
  function pick(p) { setF({ ...f, produtoId: p.id, sku: p.codigo }); setQ(p.codigo + ' · ' + p.nome); setSug([]); }
  function setComp(i, patch) { setF({ ...f, receita: f.receita.map((c, idx) => idx === i ? { ...c, ...patch } : c) }); }
  function addComp() { setF({ ...f, receita: [...f.receita, compVazio()] }); }
  function delComp(i) { setF({ ...f, receita: f.receita.filter((_, idx) => idx !== i) }); }

  async function salvar() {
    if (!f.nome.trim()) { toast('Informe o nome da cor.', 'err'); return; }
    setBusy(true);
    const receita = (f.receita || []).filter((c) => c.nome.trim());
    try {
      if (f.id) await api.indCorEditar(f.id, { ...f, receita });
      else await api.indCorCriar({ ...f, receita });
      toast('Cor salva'); onSaved();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  }
  async function excluir() {
    if (!window.confirm(`Excluir a cor ${f.nome}?`)) return;
    try { await api.indCorRemover(f.id); toast('Cor excluída'); onSaved(); } catch (e) { toast(e.message, 'err'); }
  }

  return (
    <div className="panel" style={{ padding: 18 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onClose}><Ic name="back" />Voltar às cores</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="color" value={f.hex} onChange={(e) => setF({ ...f, hex: e.target.value })} style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer' }} />
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome da cor" style={{ flex: 1, minWidth: 160, fontSize: 16, fontWeight: 600, height: 42, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 8 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="field" style={{ position: 'relative' }}>
          <label>Produto no Bling Indústria</label>
          <input value={q} onChange={(e) => buscar(e.target.value)} placeholder="buscar por nome ou SKU…" autoComplete="off" />
          {sug.length > 0 && (
            <div className="ac-list">
              {sug.map((s) => <div key={s.id} className="ac-item" onMouseDown={(e) => { e.preventDefault(); pick(s); }}>
                <span className="nm">{s.nome}</span><span className="meta">{s.codigo}</span></div>)}
            </div>
          )}
        </div>
        <div className="field">
          <label>Estoque mínimo (kg)</label>
          <input value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} placeholder="ex.: 30" inputMode="decimal" />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <b>Receita <span style={{ fontWeight: 400, color: somaPct === 100 ? '#15803d' : 'var(--ink-soft)' }}>· soma {somaPct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</span></b>
          <button className="btn btn-ghost btn-sm" onClick={addComp}><Ic name="plus" />Componente</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {f.receita.map((c, i) => {
            const kg = (Number(String(c.pct).replace(',', '.')) || 0) / 100 * lote;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px auto', gap: 8, alignItems: 'center' }}>
                <input value={c.nome} onChange={(e) => setComp(i, { nome: e.target.value })} placeholder="ex.: PLA Natural" style={{ height: 38, padding: '0 10px', border: '1px solid var(--line-strong)', borderRadius: 8 }} />
                <input value={c.pct} onChange={(e) => setComp(i, { pct: e.target.value })} placeholder="%" style={{ height: 38, textAlign: 'center', border: '1px solid var(--line-strong)', borderRadius: 8 }} />
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'right' }}>{fmtKg(Math.round(kg * 1000) / 1000)} kg</span>
                <button className="btn btn-ghost btn-sm" onClick={() => delComp(i)}><Ic name="trash" /></button>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint,#94a3b8)', marginTop: 8 }}>Quantidades calculadas para um lote de {fmtKg(lote)} kg (usa o mínimo como referência).</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={salvar} disabled={busy}><Ic name="check" />{busy ? 'Salvando…' : 'Salvar cor'}</button>
        {f.id && <button className="btn btn-ghost" onClick={excluir}><Ic name="trash" />Excluir</button>}
      </div>
    </div>
  );
}

// ---------------- Prioridade (comercial) ----------------
function Prioridade() {
  const [cores, setCores] = useState(null);
  function load() { api.indCores().then((r) => setCores(r.cores || [])).catch((e) => toast(e.message, 'err')); }
  useEffect(() => { load(); }, []);

  async function setPrio(c, prioridade) {
    try { const r = await api.indPrioridade(c.id, { prioridade, obs: c.prioObs || '' }); setCores((arr) => arr.map((x) => x.id === c.id ? r.cor : x)); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function setObs(c, obs) {
    setCores((arr) => arr.map((x) => x.id === c.id ? { ...x, prioObs: obs } : x));
  }
  async function salvarObs(c) {
    try { await api.indPrioridade(c.id, { prioridade: c.prioridade, obs: c.prioObs || '' }); toast('Observação salva'); }
    catch (e) { toast(e.message, 'err'); }
  }

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, background: 'var(--blue-soft)', padding: '10px 12px', borderRadius: 8 }}>
        Defina a prioridade quando houver muitos pedidos de uma cor — a produção vê isso refletido na fila.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
        {(cores || []).map((c) => (
          <div key={c.id} className="panel" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, background: c.hex }} />
              <b style={{ flex: 1 }}>{c.nome}</b>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['alta', 'media', 'normal'].map((p) => {
                const on = c.prioridade === p;
                const cor = p === 'alta' ? { bg: '#c0322b', fg: '#fff' } : p === 'media' ? { bg: '#e0a92b', fg: '#3d2c00' } : { bg: 'var(--surface-2,#eef1f6)', fg: 'var(--ink)' };
                return <button key={p} onClick={() => setPrio(c, p)} style={{ flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 8, cursor: 'pointer', border: on ? 'none' : '1px solid var(--line)', background: on ? cor.bg : 'transparent', color: on ? cor.fg : 'var(--ink-soft)', fontWeight: on ? 600 : 400, textTransform: 'capitalize' }}>{p === 'media' ? 'média' : p}</button>;
              })}
            </div>
            <input value={c.prioObs || ''} onChange={(e) => setObs(c, e.target.value)} onBlur={() => salvarObs(c)}
              placeholder="Observação (ex.: pedido grande da loja X)" style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 13 }} />
          </div>
        ))}
      </div>
    </>
  );
}
