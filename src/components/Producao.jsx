import React, { useState } from 'react';
import { Ic } from '../icons.jsx';
import { Fila } from './Fila.jsx';
import { Estoque } from './Estoque.jsx';
import { ConsultaProduto } from './ConsultaProduto.jsx';

export function Producao({ onBack }) {
  const [tab, setTab] = useState('fila');
  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="seg" style={{ maxWidth: 540, marginBottom: 20 }}>
        <button className={tab === 'fila' ? 'on' : ''} onClick={() => setTab('fila')}><Ic name="layers" /> Fila de impressão</button>
        <button className={tab === 'estoque' ? 'on' : ''} onClick={() => setTab('estoque')}><Ic name="tag" /> Estoque</button>
        <button className={tab === 'consulta' ? 'on' : ''} onClick={() => setTab('consulta')}><Ic name="search" /> Consulta produto</button>
      </div>
      {tab === 'fila' && <Fila />}
      {tab === 'estoque' && <Estoque />}
      {tab === 'consulta' && <ConsultaProduto />}
    </>
  );
}
