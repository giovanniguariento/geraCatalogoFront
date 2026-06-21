import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Ic } from '../icons.jsx';
import { toast } from './Toasts.jsx';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function nowMonthValue() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
const fmtKg = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export function Relatorio({ onBack }) {
  const [mesAno, setMesAno] = useState(nowMonthValue());
  const [fornecedor, setFornecedor] = useState('Boreal3d P&D C');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [erro, setErro] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function calcular() {
    setErro(null); setResult(null); setProgress(null);
    const [ano, mes] = mesAno.split('-');
    if (!ano || !mes) { toast('Escolha o mês', 'err'); return; }
    if (!fornecedor.trim()) { toast('Informe o fornecedor', 'err'); return; }
    setRunning(true);
    try {
      const { jobId } = await api.blingReportStart(ano, Number(mes), fornecedor.trim());
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.blingReportStatus(jobId);
          setProgress(s.progress || null);
          if (s.status === 'done') {
            clearInterval(pollRef.current);
            setResult(s.result); setRunning(false);
          } else if (s.status === 'error') {
            clearInterval(pollRef.current);
            setErro(s.error || 'Erro ao gerar o relatório'); setRunning(false);
          }
        } catch (e) {
          clearInterval(pollRef.current);
          setErro(e.message); setRunning(false);
        }
      }, 2500);
    } catch (e) {
      setErro(e.message); setRunning(false);
    }
  }

  const [ano, mes] = mesAno.split('-');
  const pct = progress && progress.totalPedidos
    ? Math.round((progress.processados / progress.totalPedidos) * 100) : 0;

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={onBack}><Ic name="back" />Voltar</button>

      <div className="page-head">
        <div>
          <h1>Peso vendido por fornecedor</h1>
          <p>Soma o peso líquido dos produtos vendidos de um fornecedor, no mês.</p>
        </div>
      </div>

      <div className="panel" style={{ padding: 20, marginBottom: 22 }}>
        <div className="form-grid">
          <div className="field">
            <label>Mês</label>
            <input type="month" value={mesAno} onChange={(e) => setMesAno(e.target.value)} disabled={running} />
          </div>
          <div className="field">
            <label>Fornecedor</label>
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} disabled={running}
              placeholder="Nome do fornecedor no Bling" />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={calcular} disabled={running}>
          <Ic name="pdf" />{running ? 'Calculando…' : 'Calcular'}
        </button>
      </div>

      {running && (
        <div className="panel" style={{ padding: 20, marginBottom: 22 }}>
          <div className="ac-hint" style={{ marginBottom: 10 }}>
            <span className="ac-spin" />
            {!progress || progress.fase === 'listando' || progress.fase === 'iniciando'
              ? 'Buscando os pedidos do mês…'
              : `Processando pedidos: ${progress.processados} de ${progress.totalPedidos}`}
          </div>
          <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--blue)', transition: 'width .3s' }} />
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Isso pode levar alguns minutos (lemos cada pedido respeitando o limite do Bling). Pode deixar a aba aberta.
          </p>
        </div>
      )}

      {erro && (
        <div className="empty"><div className="ic"><Ic name="x" /></div>
          <h3>Não foi possível gerar</h3><p>{erro}</p></div>
      )}

      {result && (
        <>
          <div className="panel panel-hero" style={{ padding: 24, marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {MESES[Number(mes)]} de {ano} · {result.fornecedor}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 46, letterSpacing: '-1px', color: 'var(--blue-deep)', marginTop: 4 }}>
              {fmtKg(result.totalKg)} kg
            </div>
            <div className="cat-meta" style={{ fontSize: 13 }}>
              <span><b>{result.itensContabilizados}</b> itens</span>
              <span><b>{result.pedidosNoPeriodo}</b> pedidos no período</span>
              <span><b>{result.produtos.length}</b> produtos distintos</span>
            </div>
            {result.alertaItensSemPeso > 0 && (
              <p className="hint" style={{ marginTop: 12, color: 'var(--warn)' }}>
                ⚠ {result.alertaItensSemPeso} item(ns) do fornecedor estão com <b>peso líquido zerado</b> no Bling — esses não somam kg. Vale preencher o peso no cadastro.
              </p>
            )}
          </div>

          {result.produtos.length > 0 && (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Produto</th>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', textAlign: 'right' }}>Qtd</th>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', textAlign: 'right' }}>Peso un.</th>
                    <th style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', textAlign: 'right' }}>Total kg</th>
                  </tr>
                </thead>
                <tbody>
                  {result.produtos.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{p.nome}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{p.codigo}</div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{p.qtd}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtKg(p.pesoUnit)} kg</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--blue-deep)' }}>{fmtKg(p.kg)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
