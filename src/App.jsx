import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard.jsx';
import { Home } from './components/Home.jsx';
import { Editor } from './components/Editor.jsx';
import { Relatorio } from './components/Relatorio.jsx';
import { Producao } from './components/Producao.jsx';
import { Zpl } from './components/Zpl.jsx';
import { Filamentos } from './components/Filamentos.jsx';
import { Cnab } from './components/Cnab.jsx';
import { Login } from './components/Login.jsx';
import { Admin } from './components/Admin.jsx';
import { ToastHost, toast } from './components/Toasts.jsx';
import { Ic } from './icons.jsx';
import { api, getToken, setToken } from './api.js';

export default function App() {
  const [route, setRoute] = useState({ screen: 'dashboard', id: null });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // valida o token guardado ao abrir
  useEffect(() => {
    if (!getToken()) { setAuthLoading(false); return; }
    api.authMe().then((r) => setUser(r.user)).catch(() => setToken('')).finally(() => setAuthLoading(false));
  }, []);
  // logout forçado quando a API responde 401
  useEffect(() => {
    const h = () => { setUser(null); setRoute({ screen: 'dashboard', id: null }); };
    window.addEventListener('boreal-logout', h);
    return () => window.removeEventListener('boreal-logout', h);
  }, []);

  const can = (perm) => !!user && (user.role === 'admin' || (user.permissoes || []).includes(perm));
  const isAdmin = !!user && user.role === 'admin';

  const goDash = () => setRoute({ screen: 'dashboard', id: null });
  const openCatalogos = () => setRoute({ screen: 'catalogos', id: null });
  const openEditor = (id) => setRoute({ screen: 'editor', id });
  const openRelatorio = () => setRoute({ screen: 'relatorio', id: null });
  const openFila = () => setRoute({ screen: 'fila', id: null });
  const openZpl = () => setRoute({ screen: 'zpl', id: null });
  const openFilamentos = () => setRoute({ screen: 'filamentos', id: null });
  const openCnab = () => setRoute({ screen: 'cnab', id: null });
  const openUsuarios = () => setRoute({ screen: 'usuarios', id: null });
  const logout = () => { setToken(''); setUser(null); setRoute({ screen: 'dashboard', id: null }); };

  // Retorno do OAuth do Bling
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

  if (authLoading) return <div style={{ minHeight: '100vh' }} />;
  if (!user) return (<><Login onLogin={setUser} /><ToastHost /></>);

  // proteção: se a rota atual não é permitida, volta ao dashboard
  const guard = {
    catalogos: 'catalogos', editor: 'catalogos', fila: 'fila', relatorio: 'relatorios',
    zpl: 'zpl', filamentos: 'filamentos', cnab: 'cnab',
  };
  const needed = guard[route.screen];
  const usuariosOk = route.screen !== 'usuarios' || isAdmin;
  const allowed = (!needed || can(needed)) && usuariosOk;
  const scr = allowed ? route.screen : 'dashboard';

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
            {scr === 'editor' && (<><a onClick={openCatalogos}>Catálogos</a><Ic name="chev" /><span className="here">Editando</span></>)}
            {scr === 'catalogos' && <span className="here">Catálogos</span>}
            {scr === 'fila' && <span className="here">Fila de impressão</span>}
            {scr === 'relatorio' && <span className="here">Relatórios</span>}
            {scr === 'filamentos' && <span className="here">Estoque de Filamentos</span>}
            {scr === 'cnab' && <span className="here">Guias → CNAB Itaú</span>}
            {scr === 'usuarios' && <span className="here">Usuários</span>}
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema" style={{ marginLeft: 10 }}>
            {theme === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19'}
          </button>
          <button className="logout-btn" onClick={logout} title="Sair" style={{ marginLeft: 6 }}>
            <Ic name="back" />{user.nome || user.email}
          </button>
        </div>
      </div>

      <div className="wrap">
        {scr === 'dashboard' && <Dashboard user={user} can={can} isAdmin={isAdmin} onCatalogos={openCatalogos} onFila={openFila} onRelatorio={openRelatorio} onZpl={openZpl} onFilamentos={openFilamentos} onCnab={openCnab} onUsuarios={openUsuarios} />}
        {scr === 'catalogos' && <Home onOpen={openEditor} onBack={goDash} />}
        {scr === 'editor' && <Editor catalogId={route.id} onBack={openCatalogos} />}
        {scr === 'relatorio' && <Relatorio onBack={goDash} />}
        {scr === 'fila' && <Producao onBack={goDash} />}
        {scr === 'zpl' && <Zpl onBack={goDash} />}
        {scr === 'filamentos' && <Filamentos onBack={goDash} />}
        {scr === 'cnab' && <Cnab onBack={goDash} />}
        {scr === 'usuarios' && <Admin onBack={goDash} currentUser={user} />}
      </div>

      <ToastHost />
    </>
  );
}
