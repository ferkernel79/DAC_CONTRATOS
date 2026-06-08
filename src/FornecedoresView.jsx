import React, { useState } from 'react';
import { useFornecedores, removerFornecedor } from './useFirestore';
import ModalFornecedor from './ModalFornecedor';

export default function FornecedoresView() {
  const { fornecedores, loading, error } = useFornecedores();
  const [busca, setBusca] = useState('');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
  const [showModal, setShowModal] = useState(false); // false, 'novo', 'alterar'

  const formatarCNPJ = (val) => {
    const limpo = (val || '').replace(/[^0-9]/g, '');
    if (limpo.length === 11) {
      return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
    }
    if (limpo.length !== 14) return val;
    return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
  };

  const fornecedoresFiltrados = (fornecedores || []).filter(f => 
    (f.nome?.toLowerCase() || '').includes(busca.toLowerCase()) ||
    (f.cnpj || '').includes(busca)
  );

  if (loading) return <div className="flex justify-center items-center h-full"><i className="fas fa-circle-notch fa-spin text-4xl text-sop-blue"></i></div>;
  if (error) return <div className="p-4 bg-sop-red/20 border border-sop-red text-sop-red rounded-lg m-6">{error}</div>;

  return (
    <div className="flex flex-col h-full bg-bg-body overflow-hidden">
      {/* Barra de Filtros */}
      <section className="flex gap-4 px-[25px] py-4 bg-bg-surface border-b border-bg-hover shrink-0">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs text-text-secondary uppercase tracking-widest font-bold">Pesquisar Fornecedor</label>
          <input 
            type="text" 
            placeholder="Buscar por Razão Social ou CNPJ..." 
            value={busca} 
            onChange={e => setBusca(e.target.value)}
            className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue text-sm w-full" 
          />
        </div>
      </section>

      {/* Grid de Dados */}
      <div className="p-[25px] flex-1 overflow-hidden flex flex-col">
        <div className="bg-bg-surface border border-bg-hover shadow-lg rounded-xl flex flex-col overflow-hidden h-full">
          
          <div className="px-5 bg-white/5 border-b border-bg-hover flex justify-between items-center h-[60px] shrink-0">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <i className="fas fa-building text-sop-blue"></i> Cadastro de Fornecedores
              <span className="text-xs bg-bg-body px-2.5 py-1 rounded-full text-text-secondary font-normal ml-2">{fornecedoresFiltrados.length} Empresas</span>
            </div>
            <div className="flex gap-2">
              <button 
                disabled={!fornecedorSelecionado}
                onClick={() => setShowModal('alterar')}
                className="px-4 py-1.5 bg-transparent border border-text-secondary text-text-secondary rounded text-sm font-semibold hover:border-text-primary hover:text-text-primary transition-colors disabled:opacity-40"
              >
                <i className="fas fa-pen mr-2"></i> Alterar
              </button>
              <button 
                onClick={() => setShowModal('novo')}
                className="px-4 py-1.5 bg-sop-blue text-white rounded text-sm font-semibold hover:bg-sop-blue/90 transition-colors"
              >
                <i className="fas fa-plus mr-2"></i> Novo Fornecedor
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-bg-surface text-text-secondary text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-5 border-b border-bg-hover font-bold w-48">CNPJ / CPF</th>
                  <th className="py-3 px-5 border-b border-bg-hover font-bold">Razão Social / Nome</th>
                  <th className="py-3 px-5 border-b border-bg-hover font-bold">E-mail</th>
                  <th className="py-3 px-5 border-b border-bg-hover font-bold w-40">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {fornecedoresFiltrados.length === 0 ? (
                  <tr><td colSpan="4" className="py-12 text-center text-text-muted italic">Nenhum fornecedor encontrado.</td></tr>
                ) : (
                  fornecedoresFiltrados.map(f => {
                    const isSelected = fornecedorSelecionado?.id === f.id;
                    return (
                      <tr 
                        key={f.id}
                        onClick={() => setFornecedorSelecionado(isSelected ? null : f)}
                        className={`cursor-pointer transition-colors border-b border-bg-hover group ${isSelected ? 'bg-sop-blue/10 border-l-[3px] border-l-sop-blue' : 'hover:bg-bg-hover border-l-[3px] border-l-transparent'}`}
                      >
                        <td className="py-3 px-5 font-mono text-text-secondary">{formatarCNPJ(f.cnpj)}</td>
                        <td className="py-3 px-5 font-medium text-text-primary uppercase">{f.nome}</td>
                        <td className="py-3 px-5 text-text-secondary">{f.email || '-'}</td>
                        <td className="py-3 px-5 text-text-secondary flex justify-between items-center">
                          {f.telefone || '-'}
                          <button 
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`ATENÇÃO: Deseja excluir permanentemente o cadastro de ${f.nome}?`)) {
                                try {
                                  await removerFornecedor(f.id);
                                  setFornecedorSelecionado(null);
                                } catch (err) {
                                  alert("Erro ao remover: " + err.message);
                                }
                              }
                            }}
                            className="text-text-muted hover:text-sop-red opacity-0 group-hover:opacity-100 transition-all ml-2"
                            title="Remover Fornecedor"
                          >
                            <i className="fas fa-trash"></i>
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
      </div>

      {showModal && (
        <ModalFornecedor 
          fornecedorEdit={showModal === 'alterar' ? fornecedorSelecionado : null}
          onClose={() => setShowModal(false)}
          onSuccess={() => setFornecedorSelecionado(null)}
        />
      )}
    </div>
  );
}