import React, { useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';

export function ConsultaProduto() {
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [searched, setSearched] = useState(false);

  async function consultar() {
    const q = sku.trim();
    if (!q) return;
    setLoading(true); setSearched(true); setRes(null);
    try {
      const r = await api.blingProdutoPorSku(q);
      if (!r.connected) setRes({ error: 'O Bling não está conectado. Conecte no painel e tente de novo.' });
      else setRes({ found: r.found, produto: r.produto });
    } catch (e) { setRes({ error: e.message }); }
    finally { setLoading(false); }
  }

  const p = res && res.found ? res.produto : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Consulta produto</h1>
          <p>Digite o SKU para ver a foto e os dados do produto antes de imprimir.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, maxWidth: 480 }}>
        <input value={sku} onChange={(e) => setSku(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') consultar(); }}
          placeholder="Ex.: PGO-PAR-DEC-GOT-MM" autoFocus style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={consultar} disabled={loading || !sku.trim()}>
          <Ic name="search" />{loading ? 'Consultando…' : 'Consultar'}
        </button>
      </div>

      {res && res.error && (
        <div className="empty"><div className="ic"><Ic name="x" /></div><h3>Não foi possível consultar</h3><p>{res.error}</p></div>
      )}
      {searched && res && !res.error && !res.found && !loading && (
        <div className="empty"><div className="ic"><Ic name="search" /></div><h3>Nenhum produto com esse SKU</h3><p>Confira o código e tente novamente.</p></div>
      )}

      {p && (
        <div className="panel consulta-grid" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, padding: 16 }}>
            {p.image
              ? <img src={p.image} alt={p.nome} style={{ maxWidth: '100%', maxHeight: 380, borderRadius: 8, background: '#fff' }} />
              : <div style={{ textAlign: 'center', color: 'var(--ink-faint,#94a3b8)' }}><span style={{ display: 'inline-flex', opacity: .6 }}><Ic name="img" /></span><div style={{ marginTop: 8, fontSize: 13 }}>Sem foto cadastrada no Bling</div></div>}
          </div>
          <div style={{ padding: 22 }}>
            <h2 style={{ margin: '0 0 6px', fontFamily: 'var(--display)', fontSize: 20 }}>{p.nome}</h2>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 18 }}>{p.codigo}</div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 18px', margin: 0, fontSize: 14 }}>
              {p.price && <><dt style={{ color: 'var(--ink-soft)' }}>Preço</dt><dd style={{ margin: 0, fontWeight: 600 }}>R$ {p.price}</dd></>}
              {p.dimensions && <><dt style={{ color: 'var(--ink-soft)' }}>Dimensões</dt><dd style={{ margin: 0 }}>{p.dimensions}</dd></>}
              {p.weight && <><dt style={{ color: 'var(--ink-soft)' }}>Peso</dt><dd style={{ margin: 0 }}>{p.weight}</dd></>}
            </dl>
            {p.description && <p style={{ marginTop: 18, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{p.description}</p>}
          </div>
        </div>
      )}
    </>
  );
}
