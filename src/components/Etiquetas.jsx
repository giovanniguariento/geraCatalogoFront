import React, { useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const TAMANHOS = [
  { id: '10x3', label: '10×3 cm', desc: 'código de barras + nome · 2 por folha' },
  { id: '10x5', label: '10×5 cm', desc: 'texto livre centralizado' },
  { id: '10x15', label: '10×15 cm', desc: 'texto livre centralizado' },
];

const codVazio = () => ({ gtin: '', nome: '' });
const txtVazio = () => ({ texto: '' });

export function Etiquetas({ onBack }) {
  const [tamanho, setTamanho] = useState('10x3');
  const [cods, setCods] = useState([codVazio()]);
  const [txts, setTxts] = useState([txtVazio()]);
  const [busy, setBusy] = useState(false);

  const modoBarras = tamanho === '10x3';

  function setCod(i, patch) { setCods((a) => a.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function setTxt(i, v) { setTxts((a) => a.map((it, idx) => idx === i ? { texto: v } : it)); }
  function addCod() { setCods((a) => [...a, codVazio()]); }
  function addTxt() { setTxts((a) => [...a, txtVazio()]); }
  function delCod(i) { setCods((a) => a.length > 1 ? a.filter((_, idx) => idx !== i) : a); }
  function delTxt(i) { setTxts((a) => a.length > 1 ? a.filter((_, idx) => idx !== i) : a); }

  const codsValidos = cods.filter((i) => i.gtin.replace(/\D/g, '').length >= 13 && i.nome.trim());
  const txtsValidos = txts.filter((i) => i.texto.trim());
  const validos = modoBarras ? codsValidos : txtsValidos;

  async function gerar() {
    if (!validos.length) { toast(modoBarras ? 'Preencha GTIN e nome.' : 'Escreva ao menos um texto.', 'err'); return; }
    setBusy(true);
    try {
      const itens = modoBarras
        ? codsValidos.map((i) => ({ gtin: i.gtin, nome: i.nome }))
        : txtsValidos.map((i) => ({ texto: i.texto }));
      const r = await api.etiquetasGerar(tamanho, itens);
      const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = r.nome; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast(`Etiquetas geradas: ${validos.length} folha(s)`);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Gerador de Etiquetas</h1>
          <p>Escolha o tamanho e gere o PDF pronto pra impressora.</p>
        </div>
      </div>

      {/* seletor de tamanho */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {TAMANHOS.map((t) => (
          <button key={t.id} onClick={() => setTamanho(t.id)}
            className="panel" style={{
              padding: '12px 16px', textAlign: 'left', cursor: 'pointer', minWidth: 180,
              borderColor: tamanho === t.id ? 'var(--blue)' : undefined,
              background: tamanho === t.id ? 'var(--blue-soft)' : undefined,
            }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div className="panel" style={{ padding: 14 }}>
        {modoBarras ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <b>Produtos (código de barras)</b>
              <button className="btn btn-ghost btn-sm" onClick={addCod}><Ic name="plus" />Adicionar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cods.map((it, i) => {
                const okGtin = it.gtin.replace(/\D/g, '').length >= 13;
                return (
                  <div key={i} className="etq-row" style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 10, alignItems: 'end' }}>
                    <label className="fld"><span>GTIN-14</span>
                      <input value={it.gtin} onChange={(e) => setCod(i, { gtin: e.target.value })} placeholder="97901112700573" inputMode="numeric"
                        style={{ fontFamily: 'var(--mono)', borderColor: it.gtin && !okGtin ? '#e0b4b4' : undefined }} />
                    </label>
                    <label className="fld"><span>Nome do produto</span>
                      <input value={it.nome} onChange={(e) => setCod(i, { nome: e.target.value })} placeholder="Gato preto" />
                    </label>
                    <button className="btn btn-ghost btn-sm" title="Remover" onClick={() => delCod(i)} disabled={cods.length === 1} style={{ height: 38 }}><Ic name="trash" /></button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <b>Textos</b>
              <button className="btn btn-ghost btn-sm" onClick={addTxt}><Ic name="plus" />Adicionar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {txts.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <textarea value={it.texto} onChange={(e) => setTxt(i, e.target.value)} rows={2}
                    placeholder="Escreva qualquer coisa…"
                    style={{ flex: 1, padding: 10, border: '1px solid var(--line-strong)', borderRadius: 8, resize: 'vertical', fontSize: 15 }} />
                  <button className="btn btn-ghost btn-sm" title="Remover" onClick={() => delTxt(i)} disabled={txts.length === 1} style={{ height: 38 }}><Ic name="trash" /></button>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={gerar} disabled={busy || !validos.length}><Ic name="down" />{busy ? 'Gerando…' : 'Gerar PDF'}</button>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{validos.length} folha(s) · tamanho {tamanho.replace('x', '×')} cm</span>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-faint,#94a3b8)' }}>
        {modoBarras
          ? 'Código de barras ITF/GTIN-14, com nome em cima. 2 etiquetas iguais por folha.'
          : 'Texto centralizado e ajustado ao tamanho, com moldura. 1 etiqueta por folha.'}
      </div>
    </>
  );
}
