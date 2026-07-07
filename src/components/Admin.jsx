import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const LABELS = {
  catalogos: 'Catálogos',
  fila: 'Fila de impressão',
  filamentos: 'Estoque de Filamentos',
  zpl: 'Etiquetas ZPL',
  cnab: 'Guias → CNAB Itaú',
  relatorios: 'Relatórios',
};

const vazio = { email: '', nome: '', senha: '', role: 'user', permissoes: [] };

export function Admin({ onBack, currentUser }) {
  const [users, setUsers] = useState([]);
  const [perms, setPerms] = useState(Object.keys(LABELS));
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);

  function load() {
    api.usersList().then((r) => { setUsers(r.users || []); if (r.permissoes) setPerms(r.permissoes); }).catch((e) => toast(e.message, 'err'));
  }
  useEffect(() => { load(); }, []);

  function togglePerm(list, key) { return list.includes(key) ? list.filter((p) => p !== key) : [...list, key]; }

  async function criar() {
    try {
      await api.userCreate(form);
      setNovo(false); setForm(vazio); load(); toast('Usuário criado');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function salvarEdicao(u) {
    try {
      const payload = { nome: u.nome, role: u.role, ativo: u.ativo, permissoes: u.permissoes };
      if (u._senha) payload.senha = u._senha;
      await api.userUpdate(u.id, payload);
      setEditId(null); load(); toast('Usuário atualizado');
    } catch (e) { toast(e.message, 'err'); }
  }

  async function excluir(u) {
    if (!window.confirm(`Excluir o usuário ${u.email}?`)) return;
    try { await api.userDelete(u.id); load(); toast('Usuário excluído'); }
    catch (e) { toast(e.message, 'err'); }
  }

  function setU(id, patch) { setUsers((arr) => arr.map((u) => u.id === id ? { ...u, ...patch } : u)); }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Usuários e permissões</h1>
          <p>Crie usuários e libere quais telas cada um pode acessar. O administrador vê tudo.</p>
        </div>
        {!novo && <button className="btn btn-primary btn-sm" onClick={() => { setNovo(true); setForm(vazio); }}><Ic name="plus" />Novo usuário</button>}
      </div>

      {novo && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <b>Novo usuário</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, margin: '10px 0' }}>
            <label className="fld"><span>Nome</span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
            <label className="fld"><span>E-mail</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="fld"><span>Senha</span><input type="text" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></label>
            <label className="fld"><span>Perfil</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador (acessa tudo)</option>
              </select>
            </label>
          </div>
          {form.role !== 'admin' && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Telas liberadas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {perms.map((p) => (
                  <label key={p} className="perm-chip" data-on={form.permissoes.includes(p)}>
                    <input type="checkbox" checked={form.permissoes.includes(p)} onChange={() => setForm({ ...form, permissoes: togglePerm(form.permissoes, p) })} />
                    {LABELS[p] || p}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={criar} disabled={!form.email || !form.senha}><Ic name="check" />Criar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setNovo(false); setForm(vazio); }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map((u) => {
          const editing = editId === u.id;
          const isAdmin = u.role === 'admin';
          return (
            <div key={u.id} className="panel" style={{ padding: 14, opacity: u.ativo ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600 }}>{u.nome || u.email} {u.id === currentUser.id && <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>(você)</span>}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: isAdmin ? '#e7f0ff' : 'var(--surface-2,#eef1f6)', color: isAdmin ? '#1c47b8' : 'var(--ink-soft)' }}>
                  {isAdmin ? 'Administrador' : 'Usuário'}
                </span>
                {!u.ativo && <span style={{ fontSize: 11, color: '#c0322b' }}>desativado</span>}
                {!editing && <button className="btn btn-ghost btn-sm" onClick={() => setEditId(u.id)}><Ic name="edit" />Editar</button>}
                {!editing && u.id !== currentUser.id && <button className="btn btn-ghost btn-sm" onClick={() => excluir(u)}><Ic name="trash" /></button>}
              </div>

              {!editing && !isAdmin && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)' }}>
                  {(u.permissoes || []).length ? (u.permissoes.map((p) => LABELS[p] || p).join(' · ')) : 'Sem telas liberadas'}
                </div>
              )}

              {editing && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <label className="fld"><span>Nome</span><input value={u.nome || ''} onChange={(e) => setU(u.id, { nome: e.target.value })} /></label>
                    <label className="fld"><span>Perfil</span>
                      <select value={u.role} onChange={(e) => setU(u.id, { role: e.target.value })}>
                        <option value="user">Usuário</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </label>
                    <label className="fld"><span>Nova senha (opcional)</span><input type="text" value={u._senha || ''} onChange={(e) => setU(u.id, { _senha: e.target.value })} placeholder="deixe em branco p/ manter" /></label>
                    <label className="fld"><span>Status</span>
                      <select value={u.ativo ? '1' : '0'} onChange={(e) => setU(u.id, { ativo: e.target.value === '1' })}>
                        <option value="1">Ativo</option>
                        <option value="0">Desativado</option>
                      </select>
                    </label>
                  </div>
                  {u.role !== 'admin' && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Telas liberadas</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {perms.map((p) => (
                          <label key={p} className="perm-chip" data-on={(u.permissoes || []).includes(p)}>
                            <input type="checkbox" checked={(u.permissoes || []).includes(p)} onChange={() => setU(u.id, { permissoes: togglePerm(u.permissoes || [], p) })} />
                            {LABELS[p] || p}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => salvarEdicao(u)}><Ic name="check" />Salvar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(null); load(); }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
