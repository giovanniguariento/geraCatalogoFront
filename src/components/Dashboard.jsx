import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';

function Card({ icon, accent, title, desc, meta, onClick, soon }) {
  return (
    <button
      onClick={soon ? undefined : onClick}
      disabled={soon}
      className="dash-card"
      style={{
        textAlign: 'left', cursor: soon ? 'default' : 'pointer', opacity: soon ? 0.7 : 1,
        background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: 16,
        padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, width: '100%',
      }}
    >
      <span className="dash-ic" style={{
        width: 46, height: 46, borderRadius: 12, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', background: accent.bg, color: accent.fg,
      }}>
        <Ic name={icon} />
      </span>
      <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>{title}</span>
      <span style={{ color: 'var(--ink-soft)', fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>{desc}</span>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid var(--line)', paddingTop: 12, fontSize: 13,
      }}>
        <span style={{ color: 'var(--ink-faint, #94a3b8)' }}>{soon ? 'em breve' : meta}</span>
        {!soon && <span style={{ color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>Abrir <Ic name="back" /></span>}
      </span>
    </button>
  );
}

export function Dashboard({ onCatalogos, onFila, onRelatorio, onZpl }) {
  const [bling, setBling] = useState(null);
  const [nCat, setNCat] = useState(null);

  useEffect(() => { api.blingStatus().then(setBling).catch(() => setBling(null)); }, []);
  useEffect(() => { api.listCatalogs().then((l) => setNCat(l.length)).catch(() => setNCat(null)); }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>O que você quer fazer?</h1>
          <p>Escolha um módulo para começar.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {bling && bling.connected && (
            <span className="bling-badge"><Ic name="check" />Bling conectado</span>
          )}
          {bling && bling.connected && (
            <button className="btn btn-ghost btn-sm" title="Refazer a autorização com o Bling"
              onClick={() => { window.location.href = api.blingConnectUrl(); }}>
              <Ic name="link" />Reconectar
            </button>
          )}
          {bling && bling.configured && !bling.connected && (
            <button className="btn btn-ghost btn-sm" onClick={() => { window.location.href = api.blingConnectUrl(); }}>
              <Ic name="link" />Conectar ao Bling
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 8 }}>
        <Card
          icon="book" title="Catálogos"
          accent={{ bg: '#e6f0ff', fg: '#1c47b8' }}
          desc="Criar, editar e exportar catálogos de produtos em PDF."
          meta={nCat == null ? '—' : `${nCat} ${nCat === 1 ? 'catálogo' : 'catálogos'}`}
          onClick={onCatalogos}
        />
        <Card
          icon="layers" title="Fila de impressão"
          accent={{ bg: '#fdf0d9', fg: '#92590b' }}
          desc="Pedidos do Bling priorizados para a produção."
          meta="produção"
          onClick={onFila}
        />
        <Card
          icon="chart" title="Relatórios"
          accent={{ bg: '#dff4ec', fg: '#0f6e56' }}
          desc="Peso vendido por fornecedor e outras extrações do Bling."
          meta="por mês"
          onClick={onRelatorio}
        />
        <Card
          icon="tag" title="Etiquetas ZPL"
          accent={{ bg: '#efe7fb', fg: '#6d28d9' }}
          desc="Converter ZPL em PDF multipágina, sem limite de etiquetas."
          meta="ZPL → PDF"
          onClick={onZpl}
        />
      </div>
    </>
  );
}
