import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const FORMA = { '13': 'Concessionária', '91': 'Tributo' };

// converte 'AAAA-MM-DD' (input date) -> 'DDMMAAAA'
function inputParaDDMMAAAA(v) {
  if (!v) return '';
  const [a, m, d] = v.split('-');
  return `${d}${m}${a}`;
}
// extrai linhas digitáveis (arrecadação: 48 dígitos começando com 8) de um texto
function extrairLinhas(texto) {
  const achados = [];
  const re = /(?:\d[\s.\-]?){44,54}/g; // sequências longas de dígitos com separadores
  let m;
  while ((m = re.exec(texto))) {
    const d = m[0].replace(/\D/g, '');
    if ((d.length === 48 || d.length === 44) && d[0] === '8') achados.push(d);
  }
  return [...new Set(achados)];
}

export function Cnab({ onBack }) {
  const [pagador, setPagador] = useState(null);
  const [editPag, setEditPag] = useState(false);
  const [form, setForm] = useState({ razao: '', cnpj: '', agencia: '', conta: '', dac: '' });

  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState([]);
  const [dataTodas, setDataTodas] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.cnabPagador().then((r) => {
      setPagador(r.pagador);
      setForm(r.pagador);
      if (!r.pagador || !r.pagador.cnpj) setEditPag(true);
    }).catch(() => {});
  }, []);

  const pagOk = pagador && pagador.cnpj;

  async function salvarPagador() {
    try { const r = await api.cnabPagadorSet(form); setPagador(r.pagador); setEditPag(false); toast('Dados do pagador salvos'); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function lerPdf(file) {
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let txt = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        txt += ' ' + content.items.map((it) => it.str).join(' ');
      }
      const achados = extrairLinhas(txt);
      if (!achados.length) { toast('Não achei linha digitável no PDF. Cole manualmente.', 'err'); return; }
      setTexto((t) => (t ? t + '\n' : '') + achados.join('\n'));
      toast(`${achados.length} linha(s) encontrada(s) no PDF`);
    } catch (e) { toast('Falha ao ler o PDF: ' + e.message, 'err'); }
  }

  async function decodificar() {
    const linhas = texto.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!linhas.length) { toast('Cole as linhas digitáveis ou suba um PDF.', 'err'); return; }
    setBusy(true);
    try {
      const r = await api.cnabDecodificar(linhas);
      setItens((r.itens || []).map((it) => ({ ...it, venc: '', nome: it.ok ? '' : '' })));
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }

  function setItem(i, patch) { setItens((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }

  const validos = itens.filter((i) => i.ok);
  const semVenc = validos.some((i) => !i.venc);
  const total = validos.reduce((s, i) => s + (Number(i.valor) || 0), 0);

  async function gerar() {
    if (!pagOk) { toast('Preencha os dados do pagador primeiro.', 'err'); setEditPag(true); return; }
    if (!validos.length) { toast('Nenhuma guia válida.', 'err'); return; }
    if (semVenc) { toast('Preencha o vencimento de todas as guias.', 'err'); return; }
    setBusy(true);
    try {
      const payload = validos.map((i) => ({
        rep48: i.rep48, valor: i.valor, forma: i.forma, segmento: i.segmento,
        vencimento: inputParaDDMMAAAA(i.venc), nome: i.nome, seuNumero: i.seuNumero,
      }));
      const r = await api.cnabGerar(payload);
      const blob = new Blob([r.arquivo], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = r.nome; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast(`Arquivo gerado: ${r.qtd} guia(s) · ${fmtBRL(r.total)}`);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Guias → CNAB Itaú</h1>
          <p>Cole as linhas digitáveis (ou suba os PDFs), confira valor e vencimento, e gere o arquivo <b>.REM</b> pra transmitir no Itaú.</p>
        </div>
      </div>

      {/* Pagador */}
      <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <b>Conta pagadora (Itaú)</b>
          {!editPag && <button className="btn btn-ghost btn-sm" onClick={() => setEditPag(true)}><Ic name="edit" />Editar</button>}
        </div>
        {!editPag && pagOk && (
          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 6 }}>
            {pagador.razao} · CNPJ {pagador.cnpj} · Ag {pagador.agencia} · Conta {pagador.conta}-{pagador.dac}
          </div>
        )}
        {editPag && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 10 }}>
            <label className="fld"><span>Razão social</span><input value={form.razao || ''} onChange={(e) => setForm({ ...form, razao: e.target.value })} /></label>
            <label className="fld"><span>CNPJ</span><input value={form.cnpj || ''} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></label>
            <label className="fld"><span>Agência</span><input value={form.agencia || ''} onChange={(e) => setForm({ ...form, agencia: e.target.value })} /></label>
            <label className="fld"><span>Conta</span><input value={form.conta || ''} onChange={(e) => setForm({ ...form, conta: e.target.value })} /></label>
            <label className="fld"><span>Dígito (DAC)</span><input value={form.dac || ''} onChange={(e) => setForm({ ...form, dac: e.target.value })} /></label>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={salvarPagador}><Ic name="check" />Salvar</button>
            </div>
          </div>
        )}
      </div>

      {/* Entrada */}
      <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <b>Guias</b>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Ic name="pdf" />Subir PDF
            <input type="file" accept="application/pdf" multiple style={{ display: 'none' }}
              onChange={(e) => { [...e.target.files].forEach(lerPdf); e.target.value = ''; }} />
          </label>
        </div>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4}
          placeholder="Cole uma linha digitável por linha (os números embaixo do código de barras)…"
          style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 13, padding: 10, border: '1px solid var(--line)', borderRadius: 8, resize: 'vertical' }} />
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-soft" onClick={decodificar} disabled={busy}><Ic name="search" />Conferir guias</button>
        </div>
      </div>

      {/* Conferência */}
      {itens.length > 0 && (
        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <b>Conferência ({validos.length} válida{validos.length === 1 ? '' : 's'})</b>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label className="fld" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <span style={{ textTransform: 'none' }}>Vencimento p/ todas</span>
                <input type="date" value={dataTodas} onChange={(e) => { setDataTodas(e.target.value); setItens((arr) => arr.map((it) => it.ok ? { ...it, venc: e.target.value } : it)); }} />
              </label>
              <div style={{ fontWeight: 700 }}>{fmtBRL(total)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itens.map((it, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: it.ok ? 'transparent' : 'rgba(192,50,43,.05)' }}>
                {it.ok ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>valor</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtBRL(it.valor)}</div>
                      <span style={{ fontSize: 11, background: 'var(--surface-2,#eef1f6)', padding: '2px 8px', borderRadius: 999 }}>{FORMA[it.forma] || 'Tributo'}</span>
                    </div>
                    <label className="fld"><span>Vencimento</span>
                      <input type="date" value={it.venc} onChange={(e) => setItem(i, { venc: e.target.value })}
                        style={{ borderColor: it.venc ? undefined : '#e0b4b4' }} />
                    </label>
                    <label className="fld"><span>Descrição (opcional)</span>
                      <input value={it.nome} onChange={(e) => setItem(i, { nome: e.target.value })} placeholder="ex.: Energia, IPTU…" />
                    </label>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint,#94a3b8)', wordBreak: 'break-all' }}>{it.entrada}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: '#c0322b', fontWeight: 600 }}><Ic name="x" /> {it.erro}</span>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, wordBreak: 'break-all' }}>{it.entrada}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={gerar} disabled={busy || !validos.length}><Ic name="down" />Gerar arquivo .REM</button>
            {semVenc && <span style={{ fontSize: 12.5, color: '#92590b' }}>Preencha o vencimento de todas as guias.</span>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ink-faint,#94a3b8)' }}>
        <Ic name="check" /> Antes de usar pra valer, valide o arquivo no Validador de Layout do Itaú (Itaú Empresas → Transmissão de arquivos).
      </div>
    </>
  );
}
