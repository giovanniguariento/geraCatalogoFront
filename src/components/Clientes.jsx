import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const fmtKg = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const fmtData = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };

export function Clientes({ onBack }) {
  const [clientes, setClientes] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [novo, setNovo] = useState(false);
  const [formNovo, setFormNovo] = useState({ nome: '', anotacoes: '' });

  const [aberto, setAberto] = useState(null); // { cliente, historico }
  const [acao, setAcao] = useState(null);     // 'retirada' | 'credito'
  const [kg, setKg] = useState('');
  const [obs, setObs] = useState('');
  const [editAnot, setEditAnot] = useState(false);
  const [anotTxt, setAnotTxt] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.clientesList().then((r) => setClientes(r.clientes || [])).catch((e) => toast(e.message, 'err')); }
  useEffect(() => { load(); }, []);

  async function abrir(id) {
    try { const r = await api.clienteGet(id); setAberto(r); setAnotTxt(r.cliente.anotacoes || ''); setAcao(null); setKg(''); setObs(''); setEditAnot(false); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function criar() {
    try { await api.clienteCriar(formNovo); setNovo(false); setFormNovo({ nome: '', anotacoes: '' }); load(); toast('Cliente criado'); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function confirmarAcao() {
    if (!(Number(String(kg).replace(',', '.')) > 0)) { toast('Informe os kg.', 'err'); return; }
    setBusy(true);
    try {
      const fn = acao === 'credito' ? api.clienteCredito : api.clienteRetirada;
      const r = await fn(aberto.cliente.id, { kg, obs });
      setAberto(r); setAcao(null); setKg(''); setObs(''); load();
      toast(acao === 'credito' ? 'Crédito adicionado' : 'Retirada registrada');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }

  async function salvarAnot() {
    try { const r = await api.clienteEditar(aberto.cliente.id, { anotacoes: anotTxt }); setAberto({ ...aberto, cliente: r.cliente }); setEditAnot(false); load(); toast('Anotações salvas'); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function excluirMov(m) {
    if (!window.confirm('Remover essa movimentação? O saldo será recalculado.')) return;
    try { const r = await api.clienteRemoverMov(aberto.cliente.id, m.id); setAberto(r); load(); toast('Movimentação removida'); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function excluirCliente() {
    if (!window.confirm(`Excluir o cliente ${aberto.cliente.nome} e todo o histórico?`)) return;
    try { await api.clienteRemover(aberto.cliente.id); setAberto(null); load(); toast('Cliente excluído'); }
    catch (e) { toast(e.message, 'err'); }
  }

  // ---- Detalhe ----
  if (aberto) {
    const c = aberto.cliente;
    const pctUsado = c.total > 0 ? Math.min(100, ((c.total - c.saldo) / c.total) * 100) : 0;
    const baixo = c.saldo <= 0 ? 'zero' : (c.total > 0 && c.saldo / c.total <= 0.2 ? 'baixo' : 'ok');
    return (
      <>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={() => setAberto(null)}><Ic name="back" />Voltar aos clientes</button>
        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="cli-avatar">{(c.nome || '?').slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{c.nome}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>pré-compra total {fmtKg(c.total)} kg</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>saldo atual</div>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: baixo === 'ok' ? 'inherit' : (baixo === 'zero' ? '#c0322b' : '#92590b') }}>{fmtKg(c.saldo)} kg</div>
            </div>
          </div>
          <div style={{ height: 7, background: 'var(--surface-2,#eef1f6)', borderRadius: 999, margin: '12px 0 16px', overflow: 'hidden' }}>
            <div style={{ width: pctUsado + '%', height: '100%', background: baixo === 'ok' ? 'var(--blue)' : '#e0a92b' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setAcao('retirada'); setKg(''); setObs(''); }}><Ic name="down" />Registrar retirada</button>
            <button className="btn btn-soft" onClick={() => { setAcao('credito'); setKg(''); setObs(''); }}><Ic name="plus" />Adicionar crédito</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" onClick={excluirCliente} title="Excluir cliente"><Ic name="trash" /></button>
          </div>

          {acao && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--surface-2,#f4f6fa)', borderRadius: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>{acao === 'credito' ? 'Adicionar crédito (nova pré-compra)' : 'Registrar retirada'}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={kg} onChange={(e) => setKg(e.target.value)} placeholder="2,5" inputMode="decimal"
                  style={{ width: 90, height: 42, textAlign: 'center', fontSize: 17, border: '1px solid var(--line-strong)', borderRadius: 8 }} />
                <span style={{ color: 'var(--ink-soft)' }}>kg</span>
                <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (ex.: retirou às 14h com motoboy da Uber)"
                  style={{ flex: 1, minWidth: 200, height: 42, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={confirmarAcao} disabled={busy}><Ic name="check" />{busy ? 'Salvando…' : 'Confirmar'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAcao(null)}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Anotações */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}><Ic name="edit" />Anotações do cliente</div>
              {!editAnot && <button className="btn btn-ghost btn-sm" onClick={() => { setEditAnot(true); setAnotTxt(c.anotacoes || ''); }}>Editar</button>}
            </div>
            {editAnot ? (
              <>
                <textarea value={anotTxt} onChange={(e) => setAnotTxt(e.target.value)} rows={3}
                  style={{ width: '100%', padding: 10, border: '1px solid var(--line-strong)', borderRadius: 8, resize: 'vertical', fontSize: 14 }}
                  placeholder="Preferências, contato, combinações…" />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={salvarAnot}><Ic name="check" />Salvar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditAnot(false)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div style={{ background: 'var(--surface-2,#f4f6fa)', borderRadius: 8, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, color: c.anotacoes ? 'inherit' : 'var(--ink-faint,#94a3b8)' }}>
                {c.anotacoes || 'Sem anotações. Clique em Editar para adicionar.'}
              </div>
            )}
          </div>

          {/* Histórico */}
          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Histórico</div>
            {aberto.historico.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-faint,#94a3b8)' }}>Nenhuma movimentação ainda.</div>}
            {aberto.historico.map((m) => {
              const cred = m.tipo === 'credito';
              return (
                <div key={m.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                  <Ic name={cred ? 'plus' : 'down'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontWeight: 600, color: cred ? '#15803d' : 'inherit' }}>{cred ? 'Crédito' : 'Retirada'}</span>
                      <span style={{ fontWeight: 700, color: cred ? '#15803d' : 'inherit' }}>{cred ? '+' : '−'}{fmtKg(m.kg)} kg</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{fmtData(m.data)} · saldo {fmtKg(m.saldoApos)} kg</div>
                    {m.obs && <div style={{ fontSize: 13, marginTop: 3 }}>{m.obs}</div>}
                  </div>
                  <button className="btn btn-ghost btn-sm" title="Remover" onClick={() => excluirMov(m)}><Ic name="trash" /></button>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // ---- Lista (cards) ----
  const lista = (clientes || []).filter((c) => c.nome.toLowerCase().includes(filtro.trim().toLowerCase()));
  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Saldo de Clientes</h1>
          <p>Clientes que pré-compram kg e vão retirando aos poucos. Toque num card para registrar retiradas e ver o histórico.</p>
        </div>
        {!novo && <button className="btn btn-primary btn-sm" onClick={() => setNovo(true)}><Ic name="plus" />Novo cliente</button>}
      </div>

      {novo && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <b>Novo cliente</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, margin: '10px 0' }}>
            <label className="fld"><span>Nome</span><input value={formNovo.nome} onChange={(e) => setFormNovo({ ...formNovo, nome: e.target.value })} autoFocus /></label>
            <label className="fld"><span>Anotações (opcional)</span><input value={formNovo.anotacoes} onChange={(e) => setFormNovo({ ...formNovo, anotacoes: e.target.value })} /></label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={criar} disabled={!formNovo.nome.trim()}><Ic name="check" />Criar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setNovo(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="field" style={{ marginBottom: 14 }}>
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar cliente…" style={{ height: 44, fontSize: 15 }} />
      </div>

      {clientes && lista.length === 0 && (
        <div className="empty"><div className="ic"><Ic name="layers" /></div><h3>Nenhum cliente</h3><p>Crie um cliente e registre a pré-compra dele em kg.</p></div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
        {lista.map((c) => {
          const pctUsado = c.total > 0 ? Math.min(100, ((c.total - c.saldo) / c.total) * 100) : 0;
          const baixo = c.total > 0 && c.saldo / c.total <= 0.2;
          const zero = c.saldo <= 0;
          const cor = zero ? '#c0322b' : (baixo ? '#92590b' : 'inherit');
          return (
            <button key={c.id} className="panel cli-card" onClick={() => abrir(c.id)} style={{ padding: 16, textAlign: 'left', cursor: 'pointer', borderColor: (baixo || zero) ? '#e0b48b' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="cli-avatar sm">{(c.nome || '?').slice(0, 2).toUpperCase()}</div>
                <div style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                {c.anotacoes && <Ic name="edit" />}
                {(baixo || zero) && <span style={{ fontSize: 11, background: '#fdf3da', color: '#92590b', padding: '2px 8px', borderRadius: 999 }}>{zero ? 'zerado' : 'baixo'}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: cor }}>{fmtKg(c.saldo)}</span>
                <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>kg</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint,#94a3b8)', marginTop: 2 }}>de {fmtKg(c.total)} kg</div>
              <div style={{ height: 6, background: 'var(--surface-2,#eef1f6)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: pctUsado + '%', height: '100%', background: (baixo || zero) ? '#e0a92b' : 'var(--blue)' }} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
