import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { fmtDate } from '../util.js';
import { toast } from './Toasts.jsx';
import { Confirm } from './Modal.jsx';
import { generatePDF } from '../pdf.js';

export function Home({ onOpen }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try { setList(await api.listCatalogs()); }
    catch (e) { setError(e.message); setList([]); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true);
    try { const c = await api.createCatalog(); toast('Catálogo criado'); onOpen(c.id); }
    catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }
  async function duplicate(id) {
    try { await api.duplicateCatalog(id); toast('Catálogo duplicado'); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function remove(id) {
    try { await api.deleteCatalog(id); setConfirm(null); toast('Catálogo excluído'); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function pdf(id) {
    toast('Gerando PDF…');
    try { const full = await api.getCatalog(id); await generatePDF(full); toast('PDF gerado'); }
    catch (e) { toast(e.message || 'Erro ao gerar PDF', 'err'); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Seus catálogos</h1>
          <p>Crie, edite e exporte catálogos de produtos em PDF.</p>
        </div>
        <button className="btn btn-primary" onClick={create} disabled={busy}><Ic name="plus" />Criar novo catálogo</button>
      </div>

      {list === null && (
        <div className="loading"><div className="spinner" />Carregando catálogos…</div>
      )}

      {error && (
        <div className="empty">
          <div className="ic"><Ic name="x" /></div>
          <h3>Não foi possível conectar ao servidor</h3>
          <p>{error}<br />Verifique se o backend está no ar e se <b>VITE_API_URL</b> está correto.</p>
          <button className="btn btn-ghost" style={{ margin: '0 auto' }} onClick={load}>Tentar novamente</button>
        </div>
      )}

      {list && list.length === 0 && !error && (
        <div className="empty">
          <div className="ic"><Ic name="book" /></div>
          <h3>Nenhum catálogo ainda</h3>
          <p>Comece criando seu primeiro catálogo de produtos Boreal3DShop.</p>
          <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={create}><Ic name="plus" />Criar novo catálogo</button>
        </div>
      )}

      {list && list.length > 0 && (
        <div className="grid">
          {list.map((c, n) => {
            const initials = (c.name || 'C').trim().slice(0, 2).toUpperCase();
            const logo = c.brand && c.brand.logo;
            return (
              <div className="card" key={c.id} style={{ animationDelay: n * 0.04 + 's' }}>
                <div className="card-top">
                  <div className="cat-thumb">{logo ? <img src={logo} alt="" /> : initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cat-name">{c.name}</div>
                    <div className="cat-meta">
                      <span><b>{c.pageCount}</b> {c.pageCount === 1 ? 'página' : 'páginas'}</span>
                      <span>{fmtDate(c.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn btn-soft btn-sm" onClick={() => onOpen(c.id)}><Ic name="edit" />Editar</button>
                  <button className="btn btn-primary btn-sm" onClick={() => pdf(c.id)}><Ic name="pdf" />PDF</button>
                  <button className="icon-btn" title="Duplicar" onClick={() => duplicate(c.id)}><Ic name="copy" /></button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => setConfirm(c)}><Ic name="trash" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <Confirm
          title="Excluir catálogo?"
          html={`O catálogo <b>${confirm.name}</b> e todas as suas páginas serão removidos permanentemente.`}
          onConfirm={() => remove(confirm.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
