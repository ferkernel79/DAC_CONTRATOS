import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { 
  useContratos, 
  adicionarContrato, 
  removerFiscal, 
  adicionarInstrumento, 
  removerInstrumento,
  alternarRevisadoContrato,
  alternarRenovacaoContrato
} from './useFirestore';
import ModalFiscal from './ModalFiscal';
import ModalInstrumento from './ModalInstrumento';
import ModalContrato from './ModalContrato';
import { exportarParaExcel, exportarParaPDF } from './exportUtils';

export default function ContratosView() {
  
  const { contratos, loading, error } = useContratos();
  
  const [busca, setBusca] = useState('');
  const [filtroProa, setFiltroProa] = useState('');
  const [filtroForn, setFiltroForn] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [fiscais, setFiscais] = useState([]);
  const [instrumentos, setInstrumentos] = useState([]);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  
  const [showModalFiscal, setShowModalFiscal] = useState(false);
  const [showModalInstrumento, setShowModalInstrumento] = useState(false);
  const [showModalContrato, setShowModalContrato] = useState(false);

  const fetchDetalhes = async () => {
    if (!contratoSelecionado) return;
    setLoadingDetalhes(true);
    try {
      const fiscaisSnap = await getDocs(collection(db, 'contratos', contratoSelecionado.id, 'fiscais'));
      setFiscais(fiscaisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const instSnap = await getDocs(collection(db, 'contratos', contratoSelecionado.id, 'instrumentos'));
      setInstrumentos(instSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  useEffect(() => {
    fetchDetalhes();
  }, [contratoSelecionado]);

  const contratosFiltrados = contratos.filter(c => {
    // Normaliza o status para caixa baixa para evitar conflito de maiúsculas/minúsculas
    const statusLimpo = (c.statusContrato || c.estagio || '').toLowerCase();
    
    const matchBusca = (c.fornecedorNome?.toLowerCase() || '').includes(busca.toLowerCase()) || 
                       (c.descricao?.toLowerCase() || '').includes(busca.toLowerCase()) ||
                       (c.objeto?.toLowerCase() || '').includes(busca.toLowerCase());
                       
    const matchProa = (c.proaOriginal || c.id).includes(filtroProa);
    const matchForn = (c.fornecedorNome?.toLowerCase() || '').includes(filtroForn.toLowerCase());
    
    // --- NOVA INTELIGÊNCIA DE FILTRAGEM POR STATUS DA DAC ---
    const matchStatus = filtroStatus === 'Todos' || 
                        // Filtra tudo que está ativo (regras normais e alertas de prazo)
                        (filtroStatus === 'Vigente' && statusLimpo.includes('vigente') && !statusLimpo.includes('não')) ||
                        // Filtra cirurgicamente apenas os contratos críticos com menos de 90 dias restante
                        (filtroStatus === 'Alerta' && statusLimpo.includes('<')) ||
                        // Filtra contratos vencidos ou legados encerrados
                        (filtroStatus === 'NaoVigente' && (statusLimpo.includes('não vigente') || statusLimpo.includes('encerrado'))) ||
                        // Filtra contratos novos que ainda não possuem nenhum termo/instrumento
                        (filtroStatus === 'NaoAtribuido' && statusLimpo.includes('não atribuído'));
    
    return matchBusca && matchProa && matchForn && matchStatus;
  });

  if (loading) return <div className="flex justify-center items-center h-full"><i className="fas fa-circle-notch fa-spin text-4xl text-sop-green"></i></div>;
  if (error) return <div className="p-4 bg-sop-red/20 border border-sop-red text-sop-red rounded-lg m-6">{error}</div>;

  return (
    <div className="flex flex-col h-full bg-bg-body overflow-hidden">
      
      {/* SEÇÃO DE FILTROS */}
      <section className="flex gap-4 px-[25px] py-4 bg-bg-surface border-b border-bg-hover shrink-0">
        <div className="flex flex-col gap-2 flex-[2]">
          <label className="text-xs text-text-secondary uppercase tracking-widest font-bold">Busca Livre</label>
          <input type="text" placeholder="Objeto, descrição..." value={busca} onChange={e => setBusca(e.target.value)}
            className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm w-full" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs text-text-secondary uppercase tracking-widest font-bold">PROA</label>
          <input type="text" placeholder="00/0000..." value={filtroProa} onChange={e => setFiltroProa(e.target.value)}
            className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm w-full" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs text-text-secondary uppercase tracking-widest font-bold">Fornecedor</label>
          <input type="text" placeholder="CNPJ/Nome" value={filtroForn} onChange={e => setFiltroForn(e.target.value)}
            className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm w-full" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs text-text-secondary uppercase tracking-widest font-bold">Status</label>
          <select 
            value={filtroStatus} 
            onChange={e => setFiltroStatus(e.target.value)}
            className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm w-full font-medium"
          >
            <option value="Todos">Todos os Contratos</option>
            <option value="Vigente">Vigentes (Geral)</option>
            <option value="Alerta">Em Alerta (⏱️ &lt; 90 Dias)</option>
            <option value="NaoVigente">Não Vigentes (Vencidos)</option>
            <option value="NaoAtribuido">Não Atribuídos (Sem Instrumento)</option>
          </select>
        </div>      </section>

      {/* DASHBOARD GRID */}
      <div className="p-[25px] grid gap-[25px] flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '55% minmax(0, 1fr)' }}>
        
        {/* TABELA PRINCIPAL DE CONTRATOS */}
        <div className="col-span-2 bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 bg-white/5 border-b border-bg-hover flex justify-between items-center h-[60px] shrink-0">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <i className="fas fa-list text-sop-green"></i> Contratos
              <span className="text-xs bg-bg-body px-2.5 py-1 rounded-full text-text-secondary font-normal ml-2">{contratosFiltrados.length} Itens</span>
            </div>
            <div className="flex gap-2">
            <button 
    onClick={() => {
      // Aqui você pode opcionalmente passar os históricos de subcoleções se já os tiver carregados,
      // ou passar arrays vazias para gerar a estrutura base limpa
      exportarParaExcel(contratosFiltrados, [], []);
    }}
    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 transition-colors"
    title="Exportar listagem atual para Excel (.xlsx)"
  >
    <i className="fas fa-file-excel mr-2"></i> Exportar Excel
  </button>

  {/* BOTÃO PDF */}
  <button 
    onClick={() => exportarParaPDF(contratosFiltrados)}
    className="px-3 py-1.5 bg-sop-red text-white rounded text-sm font-semibold hover:bg-sop-red/90 transition-colors"
    title="Imprimir Relatório em PDF"
  >
    <i className="fas fa-file-pdf mr-2"></i> Exportar PDF
  </button>

  <button 
    disabled={!contratoSelecionado}
    onClick={() => setShowModalContrato('alterar')}
    className="px-4 py-1.5 bg-transparent border border-text-secondary text-text-secondary rounded text-sm font-semibold hover:border-text-primary hover:text-text-primary transition-colors disabled:opacity-40"
  >
    <i className="fas fa-pen mr-2"></i> Alterar
  </button>  
              <button 
                onClick={() => setShowModalContrato(true)}
                className="px-4 py-1.5 bg-sop-green text-white rounded text-sm font-semibold hover:bg-sop-green/90 transition-colors"
              >
                <i className="fas fa-plus mr-2"></i> Novo Contrato
              </button>
              
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm border-collapse table-auto">
            <thead className="bg-bg-surface text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-2 border-b border-bg-hover text-center w-[45px] font-bold">Rev.</th>
                {/* PROA blindado contra quebra de linha */}
                <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[170px] min-w-[170px]">PROA</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[100px]">FPE</th>
                {/* Objeto com controle de tamanho */}
                <th className="py-3 px-4 border-b border-bg-hover font-bold word-break-normal w-[220px] min-w-[250px]">Objeto (Descrição)</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[200px]">Classificação</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[200px]">Tipo Serviço</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold min-w-[160px]">Contratada</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold text-right w-[130px]">Valor Total</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold text-center w-[100px]">Vigência</th> 
                <th className="py-3 px-4 border-b border-bg-hover font-bold text-center w-[140px]">Estágio</th>
                <th className="py-3 px-4 border-b border-bg-hover font-bold text-center w-[100px]">Ações</th>
              </tr>
            </thead>
              <tbody>
                {contratosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-text-muted italic">
                      Nenhum contrato encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  contratosFiltrados.map((c) => {
                    const isSelecionado = contratoSelecionado?.id === c.id;
                    
                    const linhaEstilo = c.emRenovacao 
                      ? 'bg-amber-500/10 hover:bg-amber-500/25 text-amber-600 border-l-4 border-l-amber-500 font-medium' 
                      : isSelecionado
                        ? 'bg-sop-blue/10 text-text-primary border-b border-bg-hover font-medium'
                        : 'hover:bg-bg-hover text-text-primary border-b border-bg-hover';

                    const obterEstiloStatus = (status) => {
                      if (!status) return 'bg-bg-body text-text-secondary';
                      if (status.includes('NÃO VIGENTE')) return 'bg-sop-red/20 text-sop-red font-bold animate-pulse';
                      if (status.includes('<')) return 'bg-amber-500/20 text-amber-600 font-semibold';
                      if (status.includes('NÃO ATRIBUÍDO')) return 'bg-text-muted/20 text-text-muted italic';
                      return 'bg-sop-green/20 text-sop-green font-medium';
                    };

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => setContratoSelecionado(c)}
                        className={`transition-all duration-150 cursor-pointer ${linhaEstilo}`}
                      >
                        {/* COLUNA 1: FLAG REVISADO */}
                        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title={c.revisado ? "Contrato Homologado" : "Pendente de Revisão"}
                            onClick={async () => {
                              try {
                                await alternarRevisadoContrato(c.id, !!c.revisado);
                              } catch (err) {
                                alert("Erro ao salvar revisão: " + err.message);
                              }
                            }}
                            className={`text-sm transition-transform active:scale-95 ${c.revisado ? 'text-sop-green' : 'text-text-muted hover:text-sop-blue'}`}
                          >
                            <i className={c.revisado ? "fas fa-check-circle" : "far fa-circle"}></i>
                          </button>
                        </td>

                        {/* COLUNA 2: PROA */}
                        <td className="py-3 px-4 font-mono font-bold text-xs">{c.proaOriginal || c.id}</td>
                        
                        {/* COLUNA 3: FPE */}
                        <td className="py-3 px-4 font-mono text-xs text-text-secondary">{c.fpe || '-'}</td>

                        {/* COLUNA 4: OBJETO REAL (Fallback inteligente) */}
                        <td className="py-3 px-4 text-xs max-w-xs truncate" title={c.objeto || c.descricao}>
                          {c.objeto || c.descricao || '-'}
                        </td>

                        {/* COLUNA 5: CLASSIFICAÇÃO (Tratada do CSV) */}
                        <td className="py-3 px-4 text-xs text-text-secondary truncate max-w-[140px]" title={c.classificacao || (c.importadoDoCsv ? c.objeto : '')}>
                          {c.classificacao || (c.importadoDoCsv ? c.objeto : '-')}
                        </td>

                        {/* COLUNA 6: TIPO DE SERVIÇO */}
                        <td className="py-3 px-4 text-xs text-text-secondary">{c.tipoServico || '-'}</td>

                        {/* COLUNA 7: CONTRATADA */}
                        <td className="py-3 px-4 text-xs truncate max-w-[180px]" title={c.fornecedorNome}>
                          {c.fornecedorNome || '-'}
                        </td>

                        {/* COLUNA 8: VALOR TOTAL AGREGADO */}
                        <td className="py-3 px-4 font-mono text-xs text-right font-semibold">
                          {c.valorTotal 
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valorTotal) 
                            : 'R$ 0,00'}
                        </td>

                        {/* COLUNA 9: VIGÊNCIA CALCULADA */}
                        <td className="py-3 px-4 font-mono text-xs text-center">
                          {c.vigenciaOficial
                            ? (c.vigenciaOficial.toDate ? c.vigenciaOficial.toDate() : new Date(c.vigenciaOficial)).toLocaleDateString('pt-BR')
                            : '-'}
                        </td>

                        {/* COLUNA 10: ESTÁGIO / STATUS DINÂMICO */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${obterEstiloStatus(c.statusContrato || c.estagio)}`}>
                            {c.statusContrato || c.estagio || '[NÃO ATRIBUÍDO]'}
                          </span>
                        </td>

                        {/* COLUNA 11: ALTERNAR RENOVAÇÃO */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => alternarRenovacaoContrato(c.id, !!c.emRenovacao)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${c.emRenovacao ? 'bg-amber-500 text-white' : 'bg-bg-body text-text-secondary border border-bg-hover hover:border-amber-500'}`}
                          >
                            {c.emRenovacao ? 'RENOVANDO' : 'RENOVAÇÃO?'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAINEL DE INSTRUMENTOS */}
        <div className="bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 bg-white/5 border-b border-bg-hover border-l-4 border-l-sop-yellow flex justify-between items-center h-[60px] shrink-0">
            <div className="font-semibold text-text-primary flex items-center">
              <i className="fas fa-file-invoice-dollar text-sop-yellow mr-2"></i> Instrumentos
              <span className="text-xs text-text-secondary ml-3 font-normal">
                {contratoSelecionado ? `PROA: ${contratoSelecionado.proaOriginal || contratoSelecionado.id}` : 'Selecione um contrato'}
              </span>
            </div>
            <button 
              onClick={() => setShowModalInstrumento('novo')}
              className="px-3 py-1 bg-sop-yellow text-bg-body rounded text-xs font-bold hover:bg-sop-yellow/90 disabled:opacity-40 transition-colors" 
              disabled={!contratoSelecionado}
            >
              <i className="fas fa-plus mr-1"></i> Adicionar
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-surface text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-bg-hover">Tipo</th>
                  <th className="py-3 px-4 border-b border-bg-hover">Vigência</th>
                  <th className="py-3 px-4 border-b border-bg-hover text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {!contratoSelecionado ? (
                  <tr><td colSpan="3" className="py-12 text-center text-text-muted">Selecione um contrato acima</td></tr>
                ) : loadingDetalhes ? (
                  <tr><td colSpan="3" className="py-12 text-center text-sop-yellow"><i className="fas fa-circle-notch fa-spin"></i></td></tr>
                ) : instrumentos.length === 0 ? (
                  <tr><td colSpan="3" className="py-12 text-center text-text-muted">Nenhum registro.</td></tr>
                ) : (
                  instrumentos.map((inst, idx) => (
                    <tr key={inst.id || idx} className="border-b border-bg-hover group">
                      <td className="py-3 px-4 font-medium text-text-primary">
                        {inst.tipo || 'Instrumento'} <br/>
                        <span className="text-[11px] text-text-secondary font-normal">{inst.identificacao || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {inst.dataVigencia 
                          ? (inst.dataVigencia.toDate 
                              ? inst.dataVigencia.toDate() 
                              : new Date(inst.dataVigencia)
                            ).toLocaleDateString('pt-BR')
                          : inst.fimDoContrato 
                            ? (inst.fimDoContrato.toDate 
                                ? inst.fimDoContrato.toDate() 
                                : new Date(inst.fimDoContrato)
                              ).toLocaleDateString('pt-BR')
                            : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sop-green font-semibold flex justify-end items-center gap-2">
  {/* 1. VALOR FORMATADO: Tratamento limpo usando o formatador nativo */}
  <span className="mr-2">
    {inst.valor || inst.valorContrato
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.valor || inst.valorContrato)
      : '-'}
  </span>

  {/* 2. BOTÃO DE EDITAR INSTRUMENTO */}
  <button 
    type="button"
    onClick={() => setShowModalInstrumento(inst)} 
    className="text-text-secondary hover:text-sop-blue opacity-0 group-hover:opacity-100 transition-all p-1"
    title="Editar Instrumento"
  >
    <i className="fas fa-pen text-xs"></i>
  </button>

  {/* 3. BOTÃO DE REMOVER INSTRUMENTO */}
  <button 
    type="button"
    onClick={async (e) => {
      e.stopPropagation(); // Impede de selecionar a linha de trás
      if (window.confirm(`Deseja realmente remover este instrumento do sistema?`)) {
        try {
          await removerInstrumento(contratoSelecionado.id, inst.id);
          fetchDetalhes();
        } catch (err) {
          alert("Erro ao remover: " + err.message);
        }
      }
    }}
    className="text-text-muted hover:text-sop-red opacity-0 group-hover:opacity-100 transition-all p-1"
    title="Remover Instrumento"
  >
    <i className="fas fa-trash text-xs"></i>
  </button>
</td>                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAINEL DE EQUIPE */}
        <div className="bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 bg-white/5 border-b border-bg-hover border-l-4 border-l-sop-green flex justify-between items-center h-[60px] shrink-0">
            <div className="font-semibold text-text-primary flex items-center">
              <i className="fas fa-user-shield text-sop-green mr-2"></i> Equipe
            </div>
            <button 
              onClick={() => setShowModalFiscal('novo')} // <-- Alterado de true para 'novo'
              className="px-3 py-1 bg-sop-green text-white rounded text-xs font-semibold hover:bg-sop-green/90 disabled:opacity-40 transition-colors" 
              disabled={!contratoSelecionado}
            >
              <i className="fas fa-plus mr-1"></i> Adicionar
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-surface text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-bg-hover">Função</th>
                  <th className="py-3 px-4 border-b border-bg-hover">Nome / Servidor</th>
                </tr>
              </thead>
              <tbody>
                {!contratoSelecionado ? (
                  <tr><td colSpan="2" className="py-12 text-center text-text-muted">Aguardando seleção...</td></tr>
                ) : loadingDetalhes ? (
                  <tr><td colSpan="2" className="py-12 text-center text-sop-green"><i className="fas fa-circle-notch fa-spin"></i></td></tr>
                ) : fiscais.length === 0 ? (
                  <tr><td colSpan="2" className="py-12 text-center text-text-muted">Nenhum fiscal.</td></tr>
                ) : (
                  fiscais.map((fiscal, idx) => (
                    <tr key={fiscal.id || idx} className="border-b border-bg-hover group">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 border rounded text-[10px] font-bold uppercase ${fiscal.funcao?.includes('Gestor') ? 'text-sop-green border-sop-green' : 'text-text-secondary border-bg-hover'}`}>
                          {fiscal.funcao || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-primary flex justify-between items-center">
  <div className="flex flex-col">
    <span className="font-bold uppercase text-xs">{fiscal.colaborador || fiscal.nome || '-'}</span>
    {fiscal.servidorEmail && <span className="text-[10px] text-text-secondary font-mono">{fiscal.servidorEmail}</span>}
  </div>
  
  {/* CONTAINER DE AÇÕES DO FISCAL */}
  <div className="flex items-center gap-2">
    {/* BOTÃO EDITAR FISCAL */}
    <button 
      onClick={() => setShowModalFiscal(fiscal)} // Passa o objeto do fiscal para o modal
      className="text-text-secondary hover:text-sop-blue opacity-0 group-hover:opacity-100 transition-all p-1"
      title="Editar Atribuição do Fiscal"
    >
      <i className="fas fa-pen text-xs"></i>
    </button>

    <button 
      onClick={async (e) => {
        e.stopPropagation();
        if(window.confirm(`Remover ${fiscal.colaborador || 'este fiscal'} do contrato?`)) {
          await removerFiscal(contratoSelecionado.id, fiscal.id);
          fetchDetalhes();
        }
      }}
      className="text-text-muted hover:text-sop-red opacity-0 group-hover:opacity-100 transition-all p-1"
      title="Remover Fiscal"
    >
      <i className="fas fa-trash text-xs"></i>
    </button>
  </div>
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAIS DO SISTEMA */}
      {showModalFiscal && (
        <ModalFiscal 
        contratoId={contratoSelecionado.id} 
        fiscalEdit={showModalFiscal === 'novo' ? null : showModalFiscal} // Passa os dados se for edição
        onClose={() => setShowModalFiscal(false)}
        onSuccess={fetchDetalhes}
        />
      )}

      {showModalInstrumento && (
        <ModalInstrumento 
          contratoId={contratoSelecionado.id} 
          onClose={() => setShowModalInstrumento(false)}
          onSuccess={fetchDetalhes} 
        />
      )}

      {showModalContrato && (
        <ModalContrato 
          contratoEdit={showModalContrato === 'alterar' ? contratoSelecionado : null}
          onClose={() => {
            setShowModalContrato(false);
            setContratoSelecionado(null);
          }}
        />
      )}

    </div>
  );
}