import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard.jsx';
import { Home } from './components/Home.jsx';
import { Editor } from './components/Editor.jsx';
import { Relatorio } from './components/Relatorio.jsx';
import { Producao } from './components/Producao.jsx';
import { Zpl } from './components/Zpl.jsx';
import { ToastHost, toast } from './components/Toasts.jsx';
import { Ic } from './icons.jsx';

export default function App() {
  const [route, setRoute] = useState({ screen: 'dashboard', id: null });
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const goDash = () => setRoute({ screen: 'dashboard', id: null });
  const openCatalogos = () => setRoute({ screen: 'catalogos', id: null });
  const openEditor = (id) => setRoute({ screen: 'editor', id });
  const openRelatorio = () => setRoute({ screen: 'relatorio', id: null });
  const openFila = () => setRoute({ screen: 'fila', id: null });
  const openZpl = () => setRoute({ screen: 'zpl', id: null });

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
            {theme === 'dark' ? (
              <img className="mark-word" src="/logo-white.png" alt="Boreal3DShop" />
            ) : (
              <>
                <img className="mark" src="/logo.png" alt="Boreal3DShop" />
                <div className="brand-txt"><b>Boreal3DShop</b><span>Painel</span></div>
              </>
            )}
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
          <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema claro/escuro" aria-label="Alternar tema" style={{ marginLeft: 10 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="wrap">
        {route.screen === 'dashboard' && <Dashboard onCatalogos={openCatalogos} onFila={openFila} onRelatorio={openRelatorio} onZpl={openZpl} />}
        {route.screen === 'catalogos' && <Home onOpen={openEditor} onBack={goDash} />}
        {route.screen === 'editor' && <Editor catalogId={route.id} onBack={openCatalogos} />}
        {route.screen === 'relatorio' && <Relatorio onBack={goDash} />}
        {route.screen === 'fila' && <Producao onBack={goDash} />}
        {route.screen === 'zpl' && <Zpl onBack={goDash} />}
      </div>

      <ToastHost />
    </>
  );
}
