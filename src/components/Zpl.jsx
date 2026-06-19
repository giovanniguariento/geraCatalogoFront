import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const PRESETS = [
  { label: '10 × 15 cm (envio)', w: 10, h: 15 },
  { label: '10 × 10 cm', w: 10, h: 10 },
  { label: '7,5 × 5 cm', w: 7.5, h: 5 },
  { label: '5 × 2,5 cm', w: 5, h: 2.5 },
];
const DPMM = [
  { v: 6, label: '6 dpmm (152 dpi)' },
  { v: 8, label: '8 dpmm (203 dpi)' },
  { v: 12, label: '12 dpmm (300 dpi)' },
  { v: 24, label: '24 dpmm (600 dpi)' },
];
const cmToIn = (cm) => Math.round((Number(cm) / 2.54) * 1000) / 1000;

export function Zpl({ onBack }) {
  const [zpl, setZpl] = useState('');
  const [widthCm, setWidthCm] = useState(10);
  const [heightCm, setHeightCm] = useState(15);
  const [dpmm, setDpmm] = useState(8);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const [prev, setPrev] = useState(null); // { url, total, index }
  const [prevLoading, setPrevLoading] = useState(false);
  const lastUrl = useRef(null);

  const count = useMemo(() => (zpl.match(/\^XA[\s\S]*?\^XZ/g) || []).length, [zpl]);

  useEffect(() => () => { if (lastUrl.current) URL.revokeObjectURL(lastUrl.current); }, []);

  function dims() {
    return { dpmm, width: cmToIn(widthCm), height: cmToIn(heightCm), rotation };
  }

  function loadFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setZpl(String(reader.result || ''));
    reader.readAsText(f);
  }

  async function preview(index = 0) {
    if (!zpl.trim()) { toast('Cole o ZPL ou envie um arquivo', 'err'); return; }
    setPrevLoading(true);
    try {
      const r = await api.zplPreview({ zpl, ...dims(), index });
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = r.url;
      setPrev({ url: r.url, total: r.total, index: r.index });
    } catch (e) { toast(e.message, 'err'); }
    finally { setPrevLoading(false); }
  }

  async function converter() {
    if (!zpl.trim()) { toast('Cole o ZPL ou envie um arquivo', 'err'); return; }
    setBusy(true);
    try {
      const { blob, count: n } = await api.zplConvert({ zpl, ...dims() });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (fileName ? fileName.replace(/\.[^.]+$/, '') : 'etiquetas') + '.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(`PDF gerado com ${n || count} etiqueta(s)`);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }

  const presetActive = (p) => Number(widthCm) === p.w && Number(heightCm) === p.h;

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>

      <div className="page-head">
        <div>
          <h1>Etiquetas ZPL → PDF</h1>
          <p>Cole o ZPL ou envie um arquivo .txt, pré-visualize e gere um PDF multipágina, sem limite de etiquetas.</p>
        </div>
      </div>

      <div className="panel" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, alignItems: 'end' }}>
          <div className="field">
            <label>Largura (cm)</label>
            <input type="number" min="0.5" step="0.1" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
          </div>
          <div className="field">
            <label>Altura (cm)</label>
            <input type="number" min="0.5" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="field">
            <label>Densidade</label>
            <select value={dpmm} onChange={(e) => setDpmm(Number(e.target.value))}>
              {DPMM.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Rotação</label>
            <select value={rotation} onChange={(e) => setRotation(Number(e.target.value))}>
              {[0, 90, 180, 270].map((r) => <option key={r} value={r}>{r}°</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.label} className={'btn btn-sm ' + (presetActive(p) ? 'btn-soft' : 'btn-ghost')}
              onClick={() => { setWidthCm(p.w); setHeightCm(p.h); }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap: 16, alignItems: 'start' }} className="zpl-cols">
        {/* Entrada ZPL */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-soft)' }}>Conteúdo ZPL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={fileRef} type="file" accept=".txt,.zpl,.prn,text/plain" style={{ display: 'none' }} onChange={loadFile} />
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()}><Ic name="up" />Enviar arquivo</button>
              {zpl && <button className="btn btn-ghost btn-sm" onClick={() => { setZpl(''); setFileName(''); setPrev(null); }}><Ic name="x" />Limpar</button>}
            </div>
          </div>
          {fileName && <p className="hint" style={{ marginTop: 0 }}>Arquivo: {fileName}</p>}
          <textarea value={zpl} onChange={(e) => setZpl(e.target.value)} rows={14}
            placeholder={'^XA\n^FO50,50^A0N,40,40^FDExemplo^FS\n^XZ'}
            style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14 }}>
              <b style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--blue-deep)' }}>{count}</b> etiqueta(s)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-soft btn-sm" onClick={() => preview(0)} disabled={prevLoading || !count}><Ic name="img" />Pré-visualizar</button>
              <button className="btn btn-primary btn-sm" onClick={converter} disabled={busy || !count}><Ic name="pdf" />{busy ? 'Convertendo…' : 'Gerar PDF'}</button>
            </div>
          </div>
        </div>

        {/* Pré-visualização */}
        <div className="panel" style={{ padding: 18 }}>
          <label style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-soft)' }}>Pré-visualização</label>
          <div style={{ marginTop: 10, border: '1px dashed var(--line)', borderRadius: 10, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', overflow: 'hidden', padding: 8 }}>
            {prevLoading ? <span className="ac-hint"><span className="ac-spin" />Renderizando…</span>
              : prev ? <img src={prev.url} alt="Etiqueta" style={{ maxWidth: '100%', maxHeight: 320, background: '#fff' }} />
              : <span className="hint" style={{ textAlign: 'center', margin: 0 }}>Clique em "Pré-visualizar" para ver a primeira etiqueta.</span>}
          </div>
          {prev && prev.total > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" disabled={prev.index <= 0 || prevLoading} onClick={() => preview(prev.index - 1)}>◀</button>
              <span style={{ fontSize: 13 }}>Etiqueta {prev.index + 1} de {prev.total}</span>
              <button className="btn btn-ghost btn-sm" disabled={prev.index >= prev.total - 1 || prevLoading} onClick={() => preview(prev.index + 1)}>▶</button>
            </div>
          )}
        </div>
      </div>

      <p className="hint" style={{ marginTop: 14 }}>As etiquetas são separadas por <code>^XA … ^XZ</code>. As medidas em cm são convertidas automaticamente para o formato do renderizador.</p>
    </>
  );
}
