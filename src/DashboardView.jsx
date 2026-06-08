import React from 'react';
import { useContratos } from './useFirestore';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function DashboardView() {
  const { contratos, loading, error } = useContratos();

  if (loading) {
    return (
      <div className="flex flex-col gap-2 justify-center items-center h-full text-text-secondary">
        <i className="fas fa-circle-notch fa-spin text-3xl text-sop-blue"></i>
        <span className="text-xs uppercase tracking-widest font-bold">Processando Métricas...</span>
      </div>
    );
  }

  if (error) return <div className="p-4 bg-sop-red/20 border border-sop-red text-sop-red rounded-lg m-6">{error}</div>;

// --- 1. PROCESSAMENTO DE DADOS & MÉTRICAS (COM FALLBACKS PARA DADOS LEGADOS) ---
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

// 1. FILTRO DE VIGENTES: Entende o status novo e o status antigo do CSV
const contratosVigentes = contratos.filter(c => {
  const st = (c.statusContrato || c.estagio || '').toUpperCase();
  return st.includes('VIGENTE') && !st.includes('NÃO VIGENTE');
});

// 2. FILTRO DE ALERTAS 90 DIAS: Se não houver o cálculo automático, calcula em tempo real na tela
const contratosAlerta90 = contratos.filter(c => {
  if (c.diasRestantes !== undefined && c.diasRestantes !== null) {
    return c.diasRestantes >= 0 && c.diasRestantes <= 90;
  }
  
  // Fallback: Calcula o prazo dinamicamente se o contrato veio do CSV e tem vigência informada
  const dataVigenciaRaw = c.vigenciaOficial || c.fimDoContrato || c.dataVigencia;
  if (dataVigenciaRaw) {
    const dataVenc = dataVigenciaRaw.toDate ? dataVigenciaRaw.toDate() : new Date(dataVigenciaRaw);
    dataVenc.setHours(0,0,0,0);
    const diffTime = dataVenc - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 90;
  }
  return false;
});

// 3. VALOR TOTAL DA CARTEIRA: Soma o valorTotal calculado ou recorre ao valor original do contrato
const valorTotalCarteira = contratosVigentes.reduce((sum, c) => {
  const valorEfetivo = c.valorTotal !== undefined ? c.valorTotal : (c.valor || c.valorContrato || 0);
  return sum + parseFloat(valorEfetivo || 0);
}, 0);

// 4. MÉTRICA DO MUTIRÃO DE REVISÃO
const totalRevisados = contratos.filter(c => c.revisado).length;
const pctRevisado = contratos.length > 0 ? Math.round((totalRevisados / contratos.length) * 100) : 0;

// --- 2. GRÁFICO 1: DISTRIBUIÇÃO POR CLASSIFICAÇÃO (PIZZA) ---
const agrupadoPorClassificacao = contratosVigentes.reduce((acc, c) => {
  // Agrupa usando classificação, objeto ou tipo de serviço como fallbacks sucessivos
  const classe = c.classificacao || c.tipoServico || (c.importadoDoCsv ? 'Importados (CSV)' : 'Não Categorizado');
  acc[classe] = (acc[classe] || 0) + 1;
  return acc;
}, {});

const dadosPizza = Object.keys(agrupadoPorClassificacao).map(key => ({
  name: key,
  value: agrupadoPorClassificacao[key]
}));

const CORES_PIZZA = ['#1E3A8A', '#059669', '#D97706', '#7C3AED', '#DC2626', '#2563EB', '#0D9488', '#4B5563'];

// --- 3. GRÁFICO 2: CRONOGRAMA MÓVEL DE VENCIMENTOS (12 MESES) ---
const mesesCronograma = [];
for (let i = 0; i < 12; i++) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
  mesesCronograma.push({
    key: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
    label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(),
    quantidade: 0
  });
}

contratos.forEach(c => {
  const dataVigenciaRaw = c.vigenciaOficial || c.fimDoContrato || c.dataVigencia;
  if (dataVigenciaRaw) {
    const dataVenc = dataVigenciaRaw.toDate ? dataVigenciaRaw.toDate() : new Date(dataVigenciaRaw);
    const mesAnoKey = `${String(dataVenc.getMonth() + 1).padStart(2, '0')}/${dataVenc.getFullYear()}`;
    
    const mesAlvo = mesesCronograma.find(m => m.key === mesAnoKey);
    if (mesAlvo) {
      mesAlvo.quantidade += 1;
    }
  }
});


  // Contabiliza os vencimentos dentro do range móvel
  contratos.forEach(c => {
    if (c.vigenciaOficial) {
      const dataVenc = c.vigenciaOficial.toDate ? c.vigenciaOficial.toDate() : new Date(c.vigenciaOficial);
      const mesAnoKey = `${String(dataVenc.getMonth() + 1).padStart(2, '0')}/${dataVenc.getFullYear()}`;
      
      const mesAlvo = mesesCronograma.find(m => m.key === mesAnoKey);
      if (mesAlvo) {
        mesAlvo.quantidade += 1;
      }
    }
  });

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-bg-body text-text-primary">
      
      {/* LINHA 1: CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-bg-surface border border-bg-hover p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-l-sop-blue">
          <div className="p-3 bg-sop-blue/10 rounded-lg text-sop-blue text-xl"><i className="fas fa-file-signature"></i></div>
          <div>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Contratos Vigentes</p>
            <h3 className="text-2xl font-black mt-0.5">{contratosVigentes.length}</h3>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-hover p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 text-xl"><i className="fas fa-hourglass-half"></i></div>
          <div>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">A Vencer (90 Dias)</p>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">{contratosAlerta90.length}</h3>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-hover p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-l-sop-green col-span-1 md:col-span-1">
          <div className="p-3 bg-sop-green/10 rounded-lg text-sop-green text-xl"><i className="fas fa-wallet"></i></div>
          <div>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Valor Ativo sob Gestão</p>
            <h3 className="text-xl font-black text-text-primary mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorTotalCarteira)}
            </h3>
          </div>
        </div>

        {/* CARD SUGESTÃO: STATUS DO MUTIRÃO DE REVISÃO */}
        <div className="bg-bg-surface border border-bg-hover p-4 rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-l-sop-purple">
          <div className="p-3 bg-sop-purple/10 rounded-lg text-sop-purple text-xl"><i className="fas fa-clipboard-check"></i></div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Homologação da Base</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-sop-purple">{pctRevisado}%</h3>
              <span className="text-[10px] text-text-muted font-medium">({totalRevisados} de {contratos.length} rev.)</span>
            </div>
            <div className="w-full bg-bg-body h-1.5 rounded-full mt-1 overflow-hidden">
              <div className="bg-sop-purple h-full transition-all duration-500" style={{ width: `${pctRevisado}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* LINHA 2: TABELA DE ALERTAS + GRÁFICO PIZZA CLASSIFICAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Relação de Alertas 90 dias */}
        <div className="lg:col-span-7 bg-bg-surface border border-bg-hover rounded-xl shadow-md flex flex-col h-[340px] overflow-hidden">
          <div className="px-5 py-3 border-b border-bg-hover bg-white/5 text-xs font-bold uppercase text-text-primary tracking-wider flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-amber-500 animate-pulse"></i> Próximos Vencimentos Críticos (&lt; 90 dias)
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-bg-body text-text-secondary uppercase text-[10px] tracking-wider sticky top-0 border-b border-bg-hover">
                <tr>
                  <th className="py-2 px-4">PROA</th>
                  <th className="py-2 px-4">Objeto / Contratada</th>
                  <th className="py-2 px-4 text-center">Vigência</th>
                </tr>
              </thead>
              <tbody>
                {contratosAlerta90.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-16 text-center text-text-muted italic">Nenhuma contratação expira nos próximos 90 dias.</td>
                  </tr>
                ) : (
                  contratosAlerta90.map(c => (
                    <tr key={c.id} className="border-b border-bg-hover hover:bg-bg-hover transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-sop-blue whitespace-nowrap">{c.proaOriginal || c.id}</td>
                      <td className="py-2.5 px-4 max-w-xs truncate">
                        <div className="font-semibold text-text-primary truncate">{c.objeto || c.descricao}</div>
                        <div className="text-[10px] text-text-secondary uppercase truncate font-medium">{c.fornecedorNome || '-'}</div>
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap font-mono font-semibold text-amber-600">
                        {c.vigenciaOficial ? (c.vigenciaOficial.toDate ? c.vigenciaOficial.toDate() : new Date(c.vigenciaOficial)).toLocaleDateString('pt-BR') : '-'}
                        <div className="text-[9px] font-normal text-text-muted">({c.diasRestantes} dias rest.)</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Pizza por Classificação */}
        <div className="lg:col-span-5 bg-bg-surface border border-bg-hover rounded-xl shadow-md p-4 flex flex-col h-[340px]">
          <div className="text-xs font-bold uppercase text-text-primary tracking-wider mb-2 flex items-center gap-2">
            <i className="fas fa-chart-pie text-sop-blue"></i> Mix de Contratos Vigentes por Tipo
          </div>
          <div className="flex-1 relative min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#F8FAFC', fontSize: '11px', fontFamily: 'sans-serif' }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* LINHA 3: CRONOGRAMA ANUAL MÓVEL DE VENCIMENTOS (COLUNAS) */}
      <div className="bg-bg-surface border border-bg-hover rounded-xl shadow-md p-5">
        <div className="text-xs font-bold uppercase text-text-primary tracking-wider mb-4 flex items-center gap-2">
          <i className="fas fa-chart-bar text-sop-green"></i> Planejamento de Demanda: Cronograma de Vencimentos (Próximos 12 Meses Móveis)
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mesesCronograma} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} allowDecimals={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(30, 58, 138, 0.05)' }}
                contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94A3B8', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ color: '#059669', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Bar dataKey="quantidade" fill="#059669" radius={[4, 4, 0, 0]} barSize={32}>
                {mesesCronograma.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.quantidade > 0 ? '#059669' : '#94A3B8'} 
                    opacity={entry.quantidade > 0 ? 1 : 0.2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}