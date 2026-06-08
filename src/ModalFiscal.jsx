import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { adicionarFiscal, useServidores } from './useFirestore';
import ModalServidor from './ModalServidor';

export default function ModalFiscal({ contratoId, onClose }) {
  const { servidores, loading: loadingServidores } = useServidores();
  const [servidorEmail, setServidorEmail] = useState('');
  const [funcao, setFuncao] = useState('');
  const [dataPortaria, setDataPortaria] = useState('');
  
  const [showNovoServidor, setShowNovoServidor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);

    if (!servidorEmail || !funcao) {
      setErro("Selecione o servidor e a respectiva função legal.");
      return;
    }

    setLoading(true);
    try {
      // Localiza o objeto completo do servidor para passar o Nome para a subcoleção de forma performática
      const servidorSelecionado = servidores.find(s => s.email === servidorEmail);
      
      let dateObj = null;
      if (dataPortaria) {
        const [ano, mes, dia] = dataPortaria.split('-');
        dateObj = new Date(ano, mes - 1, dia);
        dateObj.setHours(0,0,0,0);
      }

      await adicionarFiscal(contratoId, {
        servidorEmail: servidorEmail,
        colaborador: servidorSelecionado?.nome || '',
        funcao: funcao,
        dataPortaria: dateObj
      });

      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-bg-hover rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        
        <div className="p-4 border-b border-bg-hover flex justify-between items-center bg-white/5 border-l-4 border-l-sop-blue">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <i className="fas fa-user-shield text-sop-blue"></i> Designar Função na Equipe
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-sop-red"><i className="fas fa-times"></i></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && <div className="p-3 bg-sop-red/20 border border-sop-red text-sop-red text-xs font-bold rounded">{erro}</div>}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Selecionar Servidor Cadastrado</label>
              <button 
                type="button"
                onClick={() => setShowNovoServidor(true)}
                className="text-[11px] text-sop-green font-bold hover:underline"
              >
                <i className="fas fa-plus-circle mr-1"></i> Criar Novo Servidor
              </button>
            </div>
            <select
              required
              value={servidorEmail}
              onChange={e => setServidorEmail(e.target.value)}
              disabled={loadingServidores}
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue text-sm transition-all disabled:opacity-50"
            >
              <option value="">{loadingServidores ? "Carregando servidores da SOP..." : "Escolha um servidor pelo nome..."}</option>
              {servidores.map(s => (
                <option key={s.id} value={s.email}>{s.nome} ({s.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Função Atribuída</label>
            <select
              required
              value={funcao}
              onChange={e => setFuncao(e.target.value)}
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue text-sm transition-all"
            >
              <option value="">Selecione a função da portaria...</option>
              <option value="Gestor de Contrato">Gestor de Contrato</option>
              <option value="Fiscal Técnico Titular">Fiscal Técnico Titular</option>
              <option value="Fiscal Técnico Suplente">Fiscal Técnico Suplente</option>
              <option value="Fiscal Administrativo Titular">Fiscal Administrativo Titular</option>
              <option value="Fiscal Administrativo Suplente">Fiscal Administrativo Suplente</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Data da Portaria de Designação</label>
            <input 
              type="date"
              value={dataPortaria}
              onChange={e => setDataPortaria(e.target.value)}
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue text-sm transition-all"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-bg-hover mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-text-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-sop-blue text-white rounded text-xs font-bold hover:bg-sop-blue/90 transition-colors disabled:opacity-50">
              {loading ? "Processando..." : "Vincular à Equipe"}
            </button>
          </div>
        </form>
      </div>

      {/* Mini sub-modal em cascata para criar servidor rápido caso ele não esteja listado */}
      {showNovoServidor && (
        <ModalServidor onClose={() => setShowNovoServidor(false)} />
      )}
    </div>
  );
}