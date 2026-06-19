import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard.jsx';
import { Home } from './components/Home.jsx';
import { Editor } from './components/Editor.jsx';
import { Relatorio } from './components/Relatorio.jsx';
import { Fila } from './components/Fila.jsx';
import { ToastHost, toast } from './components/Toasts.jsx';
import { Ic } from './icons.jsx';

export default function App() {
  const [route, setRoute] = useState({ screen: 'dashboard', id: null });
  const goDash = () => setRoute({ screen: 'dashboard', id: null });
  const openCatalogos = () => setRoute({ screen: 'catalogos', id: null });
  const openEditor = (id) => setRoute({ screen: 'editor', id });
  const openRelatorio = () => setRoute({ screen: 'relatorio', id: null });
  const openFila = () => setRoute({ screen: 'fila', id: null });

  // Retorno do OAuth do Bling: mostra aviso e limpa a URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('bling');
    if (!b) return;
    setTimeout(() => {
      if (b === 'connected') toast('Bling conectado com sucesso!');
      else if (b === 'error') toast('Não foi possível conectar ao Bling', 'err');
    }, 60);
    params.delete('bling');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <div className="brand" onClick={goDash}>
            <svg className="mark" viewBox="0 0 48 48" fill="none">
              <path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" fill="#2358e6" />
              <path d="M24 4 42 14 24 24 6 14 24 4Z" fill="#5b8bff" />
              <path d="M24 24 42 14v20L24 44V24Z" fill="#143a99" />
              <path d="M24 24 6 14v20l18 10V24Z" fill="#1c47b8" />
            </svg>
            <div className="brand-txt"><b>Boreal3DShop</b><span>Painel</span></div>
          </div>
          <div className="spacer" />
          <div className="crumb">
            {route.screen === 'editor' && (
              <>
                <a onClick={openCatalogos}>Catálogos</a>
                <Ic name="chev" />
                <span className="here">Editando</span>
              </>
            )}
            {route.screen === 'catalogos' && <span className="here">Catálogos</span>}
            {route.screen === 'fila' && <span className="here">Fila de impressão</span>}
            {route.screen === 'relatorio' && <span className="here">Relatórios</span>}
          </div>
        </div>
      </div>

      <div className="wrap">
        {route.screen === 'dashboard' && <Dashboard onCatalogos={openCatalogos} onFila={openFila} onRelatorio={openRelatorio} />}
        {route.screen === 'catalogos' && <Home onOpen={openEditor} onBack={goDash} />}
        {route.screen === 'editor' && <Editor catalogId={route.id} onBack={openCatalogos} />}
        {route.screen === 'relatorio' && <Relatorio onBack={goDash} />}
        {route.screen === 'fila' && <Fila onBack={goDash} />}
      </div>

      <ToastHost />
    </>
  );
}
