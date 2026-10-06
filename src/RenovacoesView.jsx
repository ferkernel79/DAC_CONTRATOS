import React, { useState, useEffect } from 'react';
import { 
  useContratos, 
  useUsuarios, 
  atribuirAnalistaRenovacao, 
  alternarRenovacaoContrato 
} from './useFirestore';

export default function RenovacoesView() {
  const { contratos = [], loading, error } = useContratos();
  const { usuarios = [] } = useUsuarios();
  const [modalAtribuicao, setModalAtribuicao] = useState(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <i className="fas fa-circle-notch fa-spin text-4xl text-sop-green"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-sop-red/20 border border-sop-red text-sop-red rounded-lg m-6">
        {error}
      </div>
    );
  }

  const contratosEmRenovacao = (contratos || []).filter(c => {
    if (!c) return false;
    const val = c.emRenovacao ?? c.em_renovacao ?? c.renovacao;
    return val === true || val === 'true' || val === 1;
  });

  const formatarData = (dataRaw) => {
    if (!dataRaw) return '-';
    try {
      if (typeof dataRaw.toDate === 'function') {
        return dataRaw.toDate().toLocaleDateString('pt-BR');
      }
      const d = new Date(dataRaw);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-body overflow-hidden">
      
      {/* CABEÇALHO */}
      <section className="px-[25px] py-6 bg-bg-surface border-b border-bg-hover shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-text-primary flex items-center gap-2">
            <i className="fas fa-sync-alt text-amber-500"></i> 
            Esteira de Renovações
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Acompanhamento, analistas responsáveis e notas de instrução processual.
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg flex items-center gap-3">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total em Tramitação</span>
          <span className="text-xl font-black text-amber-500">{contratosEmRenovacao.length}</span>
        </div>
      </section>

      {/* TABELA DE RENOVAÇÕES */}
      <div className="p-[25px] flex-1 overflow-hidden flex flex-col">
        <div className="bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-bg-surface text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="py-4 px-5 border-b border-bg-hover font-bold w-[170px]">PROA</th>
                  <th className="py-4 px-5 border-b border-bg-hover font-bold w-[220px]">Objeto / Fornecedor</th>
                  <th className="py-4 px-5 border-b border-bg-hover font-bold text-center w-[120px]">Vigência</th>
                  <th className="py-4 px-5 border-b border-bg-hover font-bold w-[180px]">Responsável</th>
                  <th className="py-4 px-5 border-b border-bg-hover font-bold">Observações / Andamento</th>
                  <th className="py-4 px-5 border-b border-bg-hover font-bold text-center w-[110px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contratosEmRenovacao.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-text-muted italic">
                      Nenhum contrato marcado para renovação no momento.
                    </td>
                  </tr>
                ) : (
                  contratosEmRenovacao.map(c => (
                    <tr key={c.id || Math.random()} className="border-b border-bg-hover hover:bg-bg-hover transition-colors group">
                      <td className="py-3 px-5 font-mono font-bold text-sop-blue">
                        {c.proaOriginal || c.id || '-'}
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-text-primary max-w-xs truncate" title={c.objeto || c.descricao}>
                          {c.objeto || c.descricao || '-'}
                        </div>
                        <div className="text-[10px] text-text-secondary uppercase truncate">
                          {c.fornecedorNome || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center font-mono text-amber-600 font-semibold whitespace-nowrap">
                        {formatarData(c.vigenciaOficial || c.fimDoContrato || c.dataVigencia)}
                      </td>
                      <td className="py-3 px-5">
                        {c.analistaRenovacao ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-sop-blue/20 flex items-center justify-center text-sop-blue text-[10px] font-black">
                              {String(c.analistaRenovacao).charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs uppercase text-text-primary truncate max-w-[130px]" title={c.analistaRenovacao}>
                              {c.analistaRenovacao}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-text-muted">Não atribuído</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        {c.observacoesRenovacao ? (
                          <p className="text-xs text-text-primary line-clamp-2" title={c.observacoesRenovacao}>
                            {c.observacoesRenovacao}
                          </p>
                        ) : (
                          <span className="text-xs text-text-muted italic">Sem observações registradas.</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setModalAtribuicao(c)}
                            className="px-2 py-1.5 bg-sop-blue/10 text-sop-blue hover:bg-sop-blue hover:text-white rounded text-[10px] font-bold uppercase transition-colors"
                            title="Editar Atribuição e Notas"
                          >
                            <i className="fas fa-edit mr-1"></i> Editar
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              if (window.confirm("Deseja retirar este contrato da esteira de renovações?")) {
                                try {
                                  await alternarRenovacaoContrato(c.id, true);
                                } catch (err) {
                                  alert("Erro ao remover: " + err.message);
                                }
                              }
                            }}
                            className="text-text-muted hover:text-sop-red px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remover da Esteira"
                          >
                            <i className="fas fa-times"></i>
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

      {/* MODAL DE ATRIBUIÇÃO E OBSERVAÇÕES */}
      {modalAtribuicao && (
        <ModalAtribuirAnalista 
          contrato={modalAtribuicao} 
          usuariosCadastrados={usuarios}
          onClose={() => setModalAtribuicao(null)} 
        />
      )}
    </div>
  );
}

// MODAL COM AUTOCOMPLETAR DE USUÁRIOS DO SISTEMA + OBSERVAÇÕES
function ModalAtribuirAnalista({ contrato, usuariosCadastrados = [], onClose }) {
  const [colaborador, setColaborador] = useState(contrato.analistaRenovacao || '');
  const [observacoes, setObservacoes] = useState(contrato.observacoesRenovacao || '');
  const [salvando, setSalvando] = useState(false);
  
  const [sugestoes, setSugestoes] = useState([]);
  const [caixaAberta, setCaixaAberta] = useState(false);

  // Lista padronizada vinda de UsuariosView / coleção 'usuarios'
  const listaUsuarios = usuariosCadastrados.map(u => ({
    nome: (u.nome || u.displayName || u.email || '').trim(),
    email: (u.email || '').trim().toLowerCase()
  })).filter(u => u.nome.length > 0);

  const handleInput = (texto) => {
    setColaborador(texto);
    if (texto && texto.trim().length > 0) {
      const filtrados = listaUsuarios.filter(u => 
        u.nome.toLowerCase().includes(texto.toLowerCase()) ||
        u.email.toLowerCase().includes(texto.toLowerCase())
      );
      setSugestoes(filtrados);
      setCaixaAberta(filtrados.length > 0);
    } else {
      setCaixaAberta(false);
    }
  };

  const aplicarSelecao = (usuario) => {
    setColaborador(usuario.nome);
    setCaixaAberta(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const nomeFinal = colaborador ? colaborador.toUpperCase().trim() : '';
      await atribuirAnalistaRenovacao(contrato.id, nomeFinal, observacoes.trim());
      onClose();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-bg-surface border border-bg-hover w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in text-text-primary">
        
        <div className="px-5 py-4 bg-white/5 border-b border-bg-hover flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-wider text-text-primary flex items-center gap-2">
            <i className="fas fa-clipboard-list text-sop-blue"></i>
            Instrução de Renovação
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4" onClick={() => setCaixaAberta(false)}>
          
          <div className="bg-bg-body p-3 rounded-md border border-bg-hover">
            <div className="text-[10px] text-text-secondary uppercase font-bold">Processo PROA:</div>
            <div className="font-mono text-sm text-sop-blue font-bold">{contrato.proaOriginal || contrato.id}</div>
            <div className="text-xs text-text-secondary truncate mt-1">{contrato.objeto || contrato.descricao}</div>
          </div>

          {/* AUTOCOMPLETAR COM USUÁRIOS DO SISTEMA */}
          <div className="flex flex-col gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs font-bold uppercase text-text-secondary">
              Usuário Responsável (Sistema)
            </label>
            <input 
              type="text" 
              placeholder="Digite o nome ou e-mail do usuário..." 
              value={colaborador} 
              onChange={e => handleInput(e.target.value)}
              onFocus={() => colaborador && colaborador.trim().length > 0 && setCaixaAberta(sugestoes.length > 0)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue text-sm uppercase w-full" 
            />

            {caixaAberta && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-bg-surface border border-bg-hover rounded-md shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-bg-hover">
                {sugestoes.map((u, i) => (
                  <li 
                    key={i}
                    onClick={() => aplicarSelecao(u)}
                    className="p-2.5 text-xs hover:bg-sop-blue hover:text-white cursor-pointer transition-colors flex flex-col"
                  >
                    <span className="font-bold uppercase">{u.nome}</span>
                    {u.email && <span className="text-[10px] opacity-75 font-mono">{u.email}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* CAMPO DE OBSERVAÇÕES */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">
              Observações / Andamento da Instrução
            </label>
            <textarea 
              rows="4"
              placeholder="Ex: Encaminhado memorando para pesquisa mercadológica; aguardando manifestação da contratada sobre interesse na prorrogação..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue text-xs resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-bg-hover">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-bg-hover text-text-secondary text-sm font-semibold rounded hover:bg-bg-hover transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={salvando} 
              className="px-4 py-2 bg-sop-blue text-white text-sm font-bold rounded hover:bg-sop-blue/90 transition-colors disabled:opacity-50"
            >
              {salvando ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-check mr-1"></i>} Salvar Alterações
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}