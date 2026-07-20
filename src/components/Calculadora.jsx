import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CORES = {
  ruim: { bg: '#ffe5e5', fg: '#c0322b', txt: 'Margem baixa' },
  atencao: { bg: '#fdf3da', fg: '#92590b', txt: 'Atenção' },
  boa: { bg: '#e1f5ea', fg: '#15803d', txt: 'Margem boa' },
};

// mesma regra do backend, para o resultado aparecer na hora enquanto digita
function arredonda(v, final) {
  const base = Math.floor(v);
  const alvo = +(base + final).toFixed(2);
  return alvo >= +v.toFixed(2) ? alvo : +(base + 1 + final).toFixed(2);
}

export function Calculadora({ onBack }) {
  const [cfg, setCfg] = useState(null);
  const [editCfg, setEditCfg] = useState(false);
  const [form, setForm] = useState({});

  const [horas, setHoras] = useState('');
  const [minutos, setMinutos] = useState('');
  const [gramas, setGramas] = useState('');
  const [precoManual, setPrecoManual] = useState('');

  useEffect(() => {
    api.calcConfig().then((r) => { setCfg(r.config); setForm(r.config); }).catch((e) => toast(e.message, 'err'));
  }, []);

  async function salvarCfg() {
    try { const r = await api.calcConfigSet(form); setCfg(r.config); setForm(r.config); setEditCfg(false); toast('Configuração salva'); }
    catch (e) { toast(e.message, 'err'); }
  }

  if (!cfg) return <div className="wrap" />;

  const tempo = (Number(horas) || 0) + ((Number(minutos) || 0) / 60);
  const g = Number(gramas) || 0;

  const valorDia = cfg.baseMes / cfg.dias;
  const valorHora = valorDia / cfg.horasDia;
  const precoBruto = valorHora * tempo;
  const precoSugerido = arredonda(precoBruto, Number(cfg.arredondaPara) || 0.9);
  const preco = precoManual !== '' ? (Number(precoManual) || 0) : precoSugerido;

  const valorGrama = (Number(cfg.precoKgFilamento) || 0) / 1000;
  const custoFilamento = valorGrama * g;
  const aposDesconto = preco * (1 - (Number(cfg.descontoPct) || 0) / 100);
  const sobra = aposDesconto - custoFilamento;
  const margemPct = preco > 0 ? (sobra / preco) * 100 : 0;
  const status = margemPct < 20 ? 'ruim' : (margemPct < 30 ? 'atencao' : 'boa');
  const cor = CORES[status];
  const temDados = tempo > 0;

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar ao painel</button>
      <div className="page-head">
        <div>
          <h1>Cálculo de produto</h1>
          <p>Informe o tempo de impressão e o filamento gasto. O preço sai pela hora-máquina e a margem é conferida na hora.</p>
        </div>
        {!editCfg && <button className="btn btn-ghost btn-sm" onClick={() => setEditCfg(true)}><Ic name="gear" />Parâmetros</button>}
      </div>

      {editCfg && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <b>Parâmetros do cálculo</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '10px 0' }}>
            <label className="fld"><span>Base do mês (R$)</span><input type="number" value={form.baseMes} onChange={(e) => setForm({ ...form, baseMes: e.target.value })} /></label>
            <label className="fld"><span>Dias no mês</span><input type="number" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} /></label>
            <label className="fld"><span>Horas por dia</span><input type="number" value={form.horasDia} onChange={(e) => setForm({ ...form, horasDia: e.target.value })} /></label>
            <label className="fld"><span>Desconto na margem (%)</span><input type="number" value={form.descontoPct} onChange={(e) => setForm({ ...form, descontoPct: e.target.value })} /></label>
            <label className="fld"><span>Filamento (R$/kg)</span><input type="number" value={form.precoKgFilamento} onChange={(e) => setForm({ ...form, precoKgFilamento: e.target.value })} /></label>
            <label className="fld"><span>Final do preço</span><input type="number" step="0.01" value={form.arredondaPara} onChange={(e) => setForm({ ...form, arredondaPara: e.target.value })} /></label>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Valor da hora: <b>{fmtBRL(valorHora)}</b> · valor do grama: <b>{fmtBRL(valorGrama)}</b>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={salvarCfg}><Ic name="check" />Salvar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setForm(cfg); setEditCfg(false); }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="calc-grid">
        {/* entrada */}
        <div className="panel" style={{ padding: 16 }}>
          <b>Dados da peça</b>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4 }}>Tempo de impressão</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="number" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="0"
                  style={{ width: 80, height: 44, textAlign: 'center', fontSize: 17, border: '1px solid var(--line-strong)', borderRadius: 8 }} />
                <span style={{ color: 'var(--ink-soft)' }}>h</span>
                <input type="number" min="0" max="59" value={minutos} onChange={(e) => setMinutos(e.target.value)} placeholder="0"
                  style={{ width: 80, height: 44, textAlign: 'center', fontSize: 17, border: '1px solid var(--line-strong)', borderRadius: 8 }} />
                <span style={{ color: 'var(--ink-soft)' }}>min</span>
              </div>
            </div>
            <label className="fld"><span>Filamento gasto (g)</span>
              <input type="number" min="0" value={gramas} onChange={(e) => setGramas(e.target.value)} placeholder="0"
                style={{ height: 44, fontSize: 17 }} />
            </label>
            <label className="fld"><span>Preço a testar (opcional)</span>
              <input type="number" step="0.01" value={precoManual} onChange={(e) => setPrecoManual(e.target.value)}
                placeholder={temDados ? String(precoSugerido).replace('.', ',') : 'usa o sugerido'} />
            </label>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint,#94a3b8)', marginTop: 12 }}>
            Base {fmtBRL(cfg.baseMes)}/mês ÷ {cfg.dias} dias ÷ {cfg.horasDia}h = <b>{fmtBRL(valorHora)}</b> por hora
          </div>
        </div>

        {/* resultado */}
        <div className="panel" style={{ padding: 16 }}>
          <b>Resultado</b>
          {!temDados ? (
            <div style={{ color: 'var(--ink-soft)', fontSize: 13.5, marginTop: 12 }}>Informe o tempo de impressão para calcular.</div>
          ) : (
            <>
              <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Preço sugerido</div>
                <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15 }}>{fmtBRL(precoSugerido)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint,#94a3b8)' }}>
                  cálculo: {fmtBRL(precoBruto)} → arredondado
                  {precoManual !== '' && <> · testando <b>{fmtBRL(preco)}</b></>}
                </div>
              </div>

              <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5 }}>
                <Linha rot={`Preço`} val={fmtBRL(preco)} />
                <Linha rot={`− ${cfg.descontoPct}% (taxas/custos)`} val={'− ' + fmtBRL(preco - aposDesconto)} soft />
                <Linha rot={`− filamento (${g || 0} g × ${fmtBRL(valorGrama)})`} val={'− ' + fmtBRL(custoFilamento)} soft />
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Sobra</span><span style={{ color: sobra < 0 ? '#c0322b' : 'inherit' }}>{fmtBRL(sobra)}</span>
                </div>
              </div>

              <div style={{ background: cor.bg, color: cor.fg, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, opacity: .85 }}>{cor.txt}</div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{margemPct.toFixed(1).replace('.', ',')}%</div>
                </div>
                <div style={{ fontSize: 12, textAlign: 'right', opacity: .9 }}>
                  abaixo de 20% ruim<br />20–30% atenção<br />30% ou mais boa
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Linha({ rot, val, soft }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: soft ? 'var(--ink-soft)' : 'inherit' }}>
      <span>{rot}</span><span>{val}</span>
    </div>
  );
}
