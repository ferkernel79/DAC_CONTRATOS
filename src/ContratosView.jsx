import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useContratos, adicionarContrato, removerFiscal, adicionarInstrumento, removerInstrumento, adicionarFiscal } from './useFirestore';
import ModalFiscal from './ModalFiscal';
import ModalInstrumento from './ModalInstrumento';
import ModalContrato from './ModalContrato';

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

  const formatarDataExibicao = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

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
    // Busca livre agora pesquisa também dentro da Descrição e do Objeto
    const matchBusca = (c.fornecedorNome?.toLowerCase() || '').includes(busca.toLowerCase()) || 
                       (c.descricao?.toLowerCase() || '').includes(busca.toLowerCase()) ||
                       (c.objeto?.toLowerCase() || '').includes(busca.toLowerCase());
                       
    const matchProa = (c.proaOriginal || c.id).includes(filtroProa);
    const matchForn = (c.fornecedorNome?.toLowerCase() || '').includes(filtroForn.toLowerCase());
    const matchStatus = filtroStatus === 'Todos' || 
                        (filtroStatus === 'Vigente' && c.estagio?.toLowerCase().includes('vigente') && !c.estagio?.toLowerCase().includes('não')) ||
                        (filtroStatus === 'Encerrado' && (!c.estagio?.toLowerCase().includes('vigente') || c.estagio?.toLowerCase().includes('não')));
    
    return matchBusca && matchProa && matchForn && matchStatus;
  });

  if (loading) return <div className="flex justify-center items-center h-full"><i className="fas fa-circle-notch fa-spin text-4xl text-sop-green"></i></div>;
  if (error) return <div className="p-4 bg-sop-red/20 border border-sop-red text-sop-red rounded-lg m-6">{error}</div>;

  return (
    <div className="flex flex-col h-full bg-bg-body overflow-hidden">
      
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
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm w-full">
            <option>Todos</option><option>Vigente</option><option>Encerrado</option>
          </select>
        </div>
      </section>

      <div className="p-[25px] grid gap-[25px] flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '55% minmax(0, 1fr)' }}>
        
        <div className="col-span-2 bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 bg-white/5 border-b border-bg-hover flex justify-between items-center h-[60px] shrink-0">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <i className="fas fa-list text-sop-green"></i> Contratos
              <span className="text-xs bg-bg-body px-2.5 py-1 rounded-full text-text-secondary font-normal ml-2">{contratosFiltrados.length} Itens</span>
            </div>
            <div className="flex gap-2">
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
                  <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[180px]">PROA</th>
                  <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[120px]">FPE</th>
                  <th className="py-3 px-4 border-b border-bg-hover font-bold min-w-[280px]">Objeto</th>
                  <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[160px]">Classificação</th>
                  <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[160px]">Tipo de Serviço</th>
                  <th className="py-3 px-4 border-b border-bg-hover font-bold min-w-[200px]">Contratada</th>
                  <th className="py-3 px-4 border-b border-bg-hover font-bold whitespace-nowrap w-[110px]">Vigência</th> 
                  <th className="py-3 px-4 border-b border-bg-hover font-bold text-center w-[120px]">Estágio</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-text-muted italic">
                      Nenhum contrato encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  contratosFiltrados.map(c => {
                    const isSelected = contratoSelecionado?.id === c.id;
                    return (
                      <tr 
                        key={c.id}
                        onClick={() => setContratoSelecionado(isSelected ? null : c)}
                        className={`cursor-pointer transition-colors border-b border-bg-hover group text-xs ${
                          isSelected ? 'bg-sop-blue/10 border-l-[3px] border-l-sop-blue' : 'hover:bg-bg-hover border-l-[3px] border-l-transparent'
                        }`}
                      >
                        {/* 1. PROA */}
                        <td className="py-3 px-4 font-mono text-text-secondary whitespace-nowrap">{c.proaOriginal}</td>
                        
                        {/* 2. FPE */}
                        <td className="py-3 px-4 font-mono text-text-secondary whitespace-nowrap">{c.fpe || '-'}</td>
                        
                        {/* 3. Objeto (Exibindo a Descrição Completa do Escopo com balão de ajuda ao passar o mouse) */}
                        <td className="py-3 px-4 text-text-primary font-medium max-w-sm truncate" title={c.descricao || c.objeto}>
                          {c.descricao || c.objeto || '-'}
                        </td>
                        
                        {/* 3. Classificação */}
                        <td className="py-3 px-4 text-text-secondary whitespace-nowrap truncate max-w-[160px]" title={c.classificacao || (c.importadoDoCsv ? c.objeto : '')}>
                          {c.classificacao || (c.importadoDoCsv ? c.objeto : '-')}
                        </td>                        
                        {/* 5. Tipo de Serviço */}
                        <td className="py-3 px-4 text-text-secondary whitespace-nowrap">{c.tipoServico || '-'}</td>
                        
                        {/* 6. Contratada */}
                        <td className="py-3 px-4 text-text-primary uppercase max-w-xs truncate" title={c.fornecedorNome}>
                          {c.fornecedorNome || '-'}
                        </td>
                        
                        {/* 7. Vigência */}
                        <td className="py-3 px-4 text-text-primary font-medium whitespace-nowrap">
                          {formatarDataExibicao(c.vigenciaOficial)}
                        </td>
                        
                        {/* 8. Estágio */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            c.estagio === 'Vigente' ? 'bg-sop-green/20 text-sop-green' :
                            c.estagio === 'Vencendo' ? 'bg-sop-yellow/20 text-sop-yellow-dark' :
                            c.estagio === 'Não vigente' ? 'bg-sop-red/20 text-sop-red' :
                            'bg-text-muted/20 text-text-secondary'
                          }`}>
                            {c.estagio || 'Sem Instrumentos'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 bg-white/5 border-b border-bg-hover border-l-4 border-l-sop-yellow flex justify-between items-center h-[60px] shrink-0">
            <div className="font-semibold text-text-primary flex items-center">
              <i className="fas fa-file-invoice-dollar text-sop-yellow mr-2"></i> Instrumentos
              <span className="text-xs text-text-secondary ml-3 font-normal">
                {contratoSelecionado ? `PROA: ${contratoSelecionado.proaOriginal || contratoSelecionado.id}` : 'Selecione um contrato'}
              </span>
            </div>
            <button 
              onClick={() => setShowModalInstrumento(true)}
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
                        {inst.fimDoContrato ? new Date(inst.fimDoContrato.seconds * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sop-green font-semibold flex justify-end items-center gap-4">
                        <span>
                          {inst.valorContrato ? `R$ ${Number(inst.valorContrato).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                        </span>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if(window.confirm(`Remover este instrumento do sistema?`)) {
                              await removerInstrumento(contratoSelecionado.id, inst.id);
                              fetchDetalhes();
                            }
                          }}
                          className="text-text-muted hover:text-sop-red opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover Instrumento"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 bg-white/5 border-b border-bg-hover border-l-4 border-l-sop-green flex justify-between items-center h-[60px] shrink-0">
            <div className="font-semibold text-text-primary flex items-center">
              <i className="fas fa-user-shield text-sop-green mr-2"></i> Equipe
            </div>
            <button 
              onClick={() => setShowModalFiscal(true)} 
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
                  <th className="py-3 px-4 border-b border-bg-hover">Nome</th>
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
                        {fiscal.emailColaborador || '-'}
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if(window.confirm(`Remover ${fiscal.emailColaborador || 'este fiscal'} do contrato?`)) {
                              await removerFiscal(contratoSelecionado.id, fiscal.id);
                              fetchDetalhes();
                            }
                          }}
                          className="text-text-muted hover:text-sop-red opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover Fiscal"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showModalFiscal && (
        <ModalFiscal 
          contratoId={contratoSelecionado.id} 
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
          setContratoSelecionado(null); // Limpa a seleção da linha ao fechar para segurança
      }}
  />
)}

    </div>
  );
}