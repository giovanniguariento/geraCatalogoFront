import React, { useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const PRESETS = [
  { label: '4 × 6 pol (envio)', width: 4, height: 6 },
  { label: '4 × 4 pol', width: 4, height: 4 },
  { label: '2 × 1 pol', width: 2, height: 1 },
  { label: '3 × 2 pol', width: 3, height: 2 },
];
const DPMM = [
  { v: 6, label: '6 dpmm (152 dpi)' },
  { v: 8, label: '8 dpmm (203 dpi)' },
  { v: 12, label: '12 dpmm (300 dpi)' },
  { v: 24, label: '24 dpmm (600 dpi)' },
];

export function Zpl({ onBack }) {
  const [zpl, setZpl] = useState('');
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(6);
  const [dpmm, setDpmm] = useState(8);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const count = useMemo(() => (zpl.match(/\^XA[\s\S]*?\^XZ/g) || []).length, [zpl]);

  function loadFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setZpl(String(reader.result || ''));
    reader.readAsText(f);
  }

  async function converter() {
    if (!zpl.trim()) { toast('Cole o ZPL ou envie um arquivo', 'err'); return; }
    setBusy(true);
    try {
      const { blob, count: n } = await api.zplConvert({ zpl, dpmm, width, height, rotation });
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

  const presetActive = (p) => Number(width) === p.width && Number(height) === p.height;

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>

      <div className="page-head">
        <div>
          <h1>Etiquetas ZPL → PDF</h1>
          <p>Cole o ZPL ou envie um arquivo .txt e gere um PDF multipágina, sem limite de etiquetas.</p>
        </div>
      </div>

      <div className="panel" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, alignItems: 'end' }}>
          <div className="field">
            <label>Largura (pol)</label>
            <input type="number" min="0.5" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} />
          </div>
          <div className="field">
            <label>Altura (pol)</label>
            <input type="number" min="0.5" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
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
              onClick={() => { setWidth(p.width); setHeight(p.height); }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
          <label style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-soft)' }}>Conteúdo ZPL</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={fileRef} type="file" accept=".txt,.zpl,.prn,text/plain" style={{ display: 'none' }} onChange={loadFile} />
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current && fileRef.current.click()}><Ic name="up" />Enviar arquivo</button>
            {zpl && <button className="btn btn-ghost btn-sm" onClick={() => { setZpl(''); setFileName(''); }}><Ic name="x" />Limpar</button>}
          </div>
        </div>
        {fileName && <p className="hint" style={{ marginTop: 0 }}>Arquivo: {fileName}</p>}
        <textarea value={zpl} onChange={(e) => setZpl(e.target.value)} rows={12}
          placeholder="^XA&#10;^FO50,50^A0N,40,40^FDExemplo^FS&#10;^XZ"
          style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.5 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 14 }}>
            <b style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--blue-deep)' }}>{count}</b> etiqueta(s) detectada(s)
          </span>
          <button className="btn btn-primary" onClick={converter} disabled={busy || !count}>
            <Ic name="pdf" />{busy ? 'Convertendo…' : 'Converter para PDF'}
          </button>
        </div>
      </div>

      <p className="hint">As etiquetas são separadas por <code>^XA … ^XZ</code>. Lotes grandes são processados em blocos e unidos num único PDF.</p>
    </>
  );
}
