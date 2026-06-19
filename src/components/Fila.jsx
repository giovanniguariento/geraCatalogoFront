import React from 'react';
import { Ic } from '../icons.jsx';

export function Fila({ onBack }) {
  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>

      <div className="page-head">
        <div>
          <h1>Fila de impressão</h1>
          <p>Pedidos do Bling priorizados para a produção.</p>
        </div>
      </div>

      <div className="empty">
        <div className="ic"><Ic name="layers" /></div>
        <h3>Em construção</h3>
        <p>
          Estamos trazendo a fila de impressão (que hoje roda no app separado) para dentro deste painel.
          Em breve ela aparece aqui, usando a mesma conexão do Bling.
        </p>
      </div>
    </>
  );
}
