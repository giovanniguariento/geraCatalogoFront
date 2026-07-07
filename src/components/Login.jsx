import React, { useState } from 'react';
import { api, setToken } from '../api.js';
import { Ic } from '../icons.jsx';

export function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  async function entrar(e) {
    e && e.preventDefault();
    setErro(''); setBusy(true);
    try {
      const r = await api.authLogin(email, senha);
      setToken(r.token);
      onLogin(r.user);
    } catch (err) { setErro(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 22 }}>
          <img src="/logo.png" alt="Boreal3DShop" style={{ height: 44 }} onError={(e) => { e.target.style.display = 'none'; }} />
          <h1 style={{ fontSize: 20, margin: 0 }}>Boreal3DShop · Painel</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>Entre com sua conta</p>
        </div>
        <form onSubmit={entrar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="fld"><span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label className="fld"><span>Senha</span>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </label>
          {erro && <div style={{ fontSize: 13, color: '#c0322b', background: 'rgba(192,50,43,.06)', padding: '8px 10px', borderRadius: 8 }}>{erro}</div>}
          <button type="submit" className="btn btn-primary" style={{ height: 44, marginTop: 4 }} disabled={busy || !email || !senha}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
