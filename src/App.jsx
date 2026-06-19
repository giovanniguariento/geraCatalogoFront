import React, { useState, useEffect } from 'react';
import { Home } from './components/Home.jsx';
import { Editor } from './components/Editor.jsx';
import { Relatorio } from './components/Relatorio.jsx';
import { ToastHost, toast } from './components/Toasts.jsx';
import { Ic } from './icons.jsx';

export default function App() {
  const [route, setRoute] = useState({ screen: 'home', id: null });
  const goHome = () => setRoute({ screen: 'home', id: null });
  const openEditor = (id) => setRoute({ screen: 'editor', id });
  const openRelatorio = () => setRoute({ screen: 'relatorio', id: null });

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
          <div className="brand" onClick={goHome}>
            <svg className="mark" viewBox="0 0 48 48" fill="none">
              <path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" fill="#2358e6" />
              <path d="M24 4 42 14 24 24 6 14 24 4Z" fill="#5b8bff" />
              <path d="M24 24 42 14v20L24 44V24Z" fill="#143a99" />
              <path d="M24 24 6 14v20l18 10V24Z" fill="#1c47b8" />
            </svg>
            <div className="brand-txt"><b>Boreal3DShop</b><span>Gerador de Catálogos</span></div>
          </div>
          <div className="spacer" />
          <div className="crumb">
            {route.screen === 'editor' && (
              <>
                <a onClick={goHome}>Catálogos</a>
                <Ic name="chev" />
                <span className="here">Editando</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        {route.screen === 'home' && <Home onOpen={openEditor} onRelatorio={openRelatorio} />}
        {route.screen === 'editor' && <Editor catalogId={route.id} onBack={goHome} />}
        {route.screen === 'relatorio' && <Relatorio onBack={goHome} />}
      </div>

      <ToastHost />
    </>
  );
}
