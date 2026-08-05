import React, { useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const vazio = () => ({ gtin: '', nome: '' });

export function Etiquetas({ onBack }) {
  const [itens, setItens] = useState([vazio()]);
  const [busy, setBusy] = useState(false);

  function setItem(i, patch) { setItens((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function add() { setItens((arr) => [...arr, vazio()]); }
  function remove(i) { setItens((arr) => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr); }

  const validos = itens.filter((i) => i.gtin.replace(/\D/g, '').length >= 13 && i.nome.trim());

  async function gerar() {
    if (!validos.length) { toast('Preencha GTIN (13–14 dígitos) e nome de pelo menos um produto.', 'err'); return; }
    setBusy(true);
    try {
      const r = await api.etiquetasGerar(validos.map((i) => ({ gtin: i.gtin, nome: i.nome })));
      const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = r.nome; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast(`Etiquetas geradas: ${r.qtd} produto(s)`);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Gerador de Etiquetas</h1>
          <p>Digite o GTIN-14 e o nome do produto. Cada produto vira uma folha 10×3 cm com 2 etiquetas iguais (código de barras + nome), pronta pra impressora.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={add}><Ic name="plus" />Adicionar produto</button>
      </div>

      <div className="panel" style={{ padding: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {itens.map((it, i) => {
            const okGtin = it.gtin.replace(/\D/g, '').length >= 13;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 10, alignItems: 'end' }} className="etq-row">
                <label className="fld"><span>GTIN-14</span>
                  <input value={it.gtin} onChange={(e) => setItem(i, { gtin: e.target.value })} placeholder="97901112700573" inputMode="numeric"
                    style={{ fontFamily: 'var(--mono)', borderColor: it.gtin && !okGtin ? '#e0b4b4' : undefined }} />
                </label>
                <label className="fld"><span>Nome do produto</span>
                  <input value={it.nome} onChange={(e) => setItem(i, { nome: e.target.value })} placeholder="Gato preto" />
                </label>
                <button className="btn btn-ghost btn-sm" title="Remover" onClick={() => remove(i)} disabled={itens.length === 1} style={{ height: 38 }}><Ic name="trash" /></button>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={gerar} disabled={busy || !validos.length}><Ic name="down" />{busy ? 'Gerando…' : 'Gerar PDF'}</button>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{validos.length} produto(s) · {validos.length} folha(s)</span>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-faint,#94a3b8)' }}>
        Código de barras ITF-14 (GTIN-14). O dígito verificador é conferido automaticamente ao gerar.
      </div>
    </>
  );
}
