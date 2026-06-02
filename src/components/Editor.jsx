import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { fmtDate, fmtPrice, resizeContain, fileToDataURL } from '../util.js';
import { toast } from './Toasts.jsx';
import { Confirm } from './Modal.jsx';
import { PageForm } from './PageForm.jsx';
import { generatePDF } from '../pdf.js';

export function Editor({ catalogId, onBack }) {
  const [cat, setCat] = useState(null);
  const [error, setError] = useState(null);
  const [brand, setBrand] = useState(null);
  const [pageForm, setPageForm] = useState(null); // {page} or {page:null}
  const [confirmPage, setConfirmPage] = useState(null);
  const logoRef = useRef(null);

  async function load() {
    setError(null);
    try {
      const c = await api.getCatalog(catalogId);
      setCat(c); setBrand({ ...c.brand });
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [catalogId]);

  async function rename(name) {
    const v = (name || '').trim() || 'Sem nome';
    try { await api.updateCatalog(catalogId, { name: v }); setCat((c) => ({ ...c, name: v })); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function saveSettings() {
    try { await api.updateCatalog(catalogId, { brand }); setCat((c) => ({ ...c, brand })); toast('Configurações salvas'); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function onLogo(e) {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const data = await fileToDataURL(f);
    const small = await resizeContain(data, 300, 160);
    const nb = { ...brand, logo: small };
    setBrand(nb);
    try { await api.updateCatalog(catalogId, { brand: nb }); setCat((c) => ({ ...c, brand: nb })); toast('Logo enviado'); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function removeLogo() {
    const nb = { ...brand, logo: null };
    setBrand(nb);
    try { await api.updateCatalog(catalogId, { brand: nb }); setCat((c) => ({ ...c, brand: nb })); }
    catch (e) { toast(e.message, 'err'); }
  }

  async function savePage(data) {
    if (pageForm.page) {
      await api.updatePage(pageForm.page.id, data);
      toast('Página atualizada');
    } else {
      await api.addPage(catalogId, data);
      toast('Página adicionada');
    }
    setPageForm(null);
    load();
  }
  async function deletePage(id) {
    try { await api.deletePage(id); setConfirmPage(null); toast('Página excluída'); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= cat.pages.length) return;
    const pages = [...cat.pages];
    [pages[i], pages[j]] = [pages[j], pages[i]];
    setCat((c) => ({ ...c, pages })); // otimista
    try { await api.reorder(catalogId, pages.map((p) => p.id)); }
    catch (e) { toast(e.message, 'err'); load(); }
  }
  async function pdf() {
    toast('Gerando PDF…');
    try { await generatePDF(cat); toast('PDF gerado'); }
    catch (e) { toast(e.message || 'Erro ao gerar PDF', 'err'); }
  }

  if (error) return (
    <div className="empty">
      <div className="ic"><Ic name="x" /></div>
      <h3>Erro ao carregar catálogo</h3>
      <p>{error}</p>
      <button className="btn btn-ghost" style={{ margin: '0 auto' }} onClick={onBack}>Voltar</button>
    </div>
  );
  if (!cat || !brand) return <div className="loading"><div className="spinner" />Carregando…</div>;

  const setB = (k) => (e) => setBrand((b) => ({ ...b, [k]: e.target.value }));

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar aos catálogos</button>

      <div className="page-head">
        <div>
          <input className="name-input" defaultValue={cat.name} onBlur={(e) => rename(e.target.value)} />
          <p style={{ marginTop: 4 }}>Criado em {fmtDate(cat.createdAt)} · {cat.pages.length} {cat.pages.length === 1 ? 'página' : 'páginas'}</p>
        </div>
        <button className="btn btn-primary" onClick={pdf}><Ic name="pdf" />Gerar PDF</button>
      </div>

      <details className="settings panel">
        <summary><Ic name="gear" />Configurações do catálogo (cabeçalho, rodapé e logo)<span className="chev"><Ic name="chev" /></span></summary>
        <div className="settings-body">
          <div className="form-grid">
            <div className="field"><label>Nome da marca</label><input value={brand.name || ''} onChange={setB('name')} /></div>
            <div className="field"><label>Título do cabeçalho</label><input value={brand.headerTitle || ''} onChange={setB('headerTitle')} /></div>
            <div className="field full"><label>Subtítulo / linha de negócio</label><input value={brand.tagline || ''} onChange={setB('tagline')} /></div>
            <div className="field"><label>Contato (rodapé)</label><input value={brand.contact || ''} onChange={setB('contact')} /></div>
            <div className="field"><label>Redes sociais (rodapé)</label><input value={brand.social || ''} onChange={setB('social')} /></div>
            <div className="field full">
              <label>Logo (opcional)</label>
              <div className="logo-row">
                <div className="logo-prev">{brand.logo ? <img src={brand.logo} alt="" /> : 'Sem logo'}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => logoRef.current.click()}><Ic name="img" />Enviar logo</button>
                {brand.logo && <button className="btn btn-danger-soft btn-sm" onClick={removeLogo}>Remover</button>}
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogo} />
              </div>
            </div>
          </div>
          <button className="btn btn-soft btn-sm" style={{ marginTop: 16 }} onClick={saveSettings}><Ic name="check" />Salvar configurações</button>
        </div>
      </details>

      <div className="editor-head">
        <h2>Páginas de produtos <span className="count-pill">{cat.pages.length}</span></h2>
        <button className="btn btn-primary" onClick={() => setPageForm({ page: null })}><Ic name="plus" />Adicionar nova página</button>
      </div>

      {cat.pages.length === 0 ? (
        <div className="empty">
          <div className="ic"><Ic name="img" /></div>
          <h3>Nenhuma página adicionada</h3>
          <p>Cada produto vira uma página do catálogo. Adicione o primeiro.</p>
          <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={() => setPageForm({ page: null })}><Ic name="plus" />Adicionar nova página</button>
        </div>
      ) : (
        <div className="plist">
          {cat.pages.map((p, i) => {
            const sub = [p.material, p.dimensions].filter(Boolean).join(' · ');
            return (
              <div className="prow" key={p.id} style={{ animationDelay: i * 0.03 + 's' }}>
                <div className="reorder">
                  <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)}><Ic name="up" /></button>
                  <button className="icon-btn" disabled={i === cat.pages.length - 1} onClick={() => move(i, 1)}><Ic name="down" /></button>
                </div>
                <div className="pnum">{i + 1}</div>
                <div className="pthumb">{p.image ? <img src={p.image} alt="" /> : <Ic name="img" />}</div>
                <div className="pinfo">
                  <div className="nm">{p.name || '(Sem nome)'}</div>
                  <div className="sub"><span className="price">{fmtPrice(p.price)}</span>{sub ? '  ·  ' + sub : ''}</div>
                </div>
                <div className="pactions">
                  <button className="btn btn-soft btn-sm" onClick={() => setPageForm({ page: p })}><Ic name="edit" />Editar</button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => setConfirmPage(p)}><Ic name="trash" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pageForm && (
        <PageForm page={pageForm.page} onSave={savePage} onClose={() => setPageForm(null)} />
      )}
      {confirmPage && (
        <Confirm
          title="Excluir página?"
          html={`A página <b>${confirmPage.name || '(sem nome)'}</b> será removida do catálogo.`}
          onConfirm={() => deletePage(confirmPage.id)}
          onClose={() => setConfirmPage(null)}
        />
      )}
    </>
  );
}
