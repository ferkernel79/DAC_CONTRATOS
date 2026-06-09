import React, { useState, useEffect } from 'react';
import { adicionarFiscal, editarFiscal } from './useFirestore';

export default function ModalFiscal({ contratoId, fiscalEdit, onClose, onSuccess }) {
  const [funcao, setFuncao] = useState('Fiscal Técnico Titular');
  const [colaborador, setColaborador] = useState('');
  const [servidorEmail, setServidorEmail] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Carrega os dados retroativamente se receber a propriedade de edição
  useEffect(() => {
    if (fiscalEdit) {
      setFuncao(fiscalEdit.funcao || 'Fiscal Técnico Titular');
      setColaborador(fiscalEdit.colaborador || fiscalEdit.nome || '');
      setServidorEmail(fiscalEdit.servidorEmail || '');
    }
  }, [fiscalEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!colaborador || !servidorEmail) {
      alert("Por favor, introduza o nome e o e-mail do servidor.");
      return;
    }

    setSalvando(true);
    try {
      const dadosForm = {
        funcao,
        colaborador: colaborador.toUpperCase().trim(),
        servidorEmail: servidorEmail.toLowerCase().trim()
      };

      if (fiscalEdit) {
        // Modo Alteração
        await editarFiscal(contratoId, fiscalEdit.id, dadosForm);
      } else {
        // Modo Novo Cadastro
        await adicionarFiscal(contratoId, dadosForm);
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao guardar dados da equipa: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-bg-surface border border-bg-hover w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in text-text-primary">
        
        <div className="px-5 py-4 bg-white/5 border-b border-bg-hover flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-user-shield text-sop-green"></i>
            {fiscalEdit ? 'Alterar Atribuição de Equipa' : 'Designar Membro da Equipa'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Função Legal (Portaria)</label>
            <select value={funcao} onChange={e => setFuncao(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm font-medium">
              <option>Gestor de Contrato</option>
              <option>Gestor Substituto</option>
              <option>Fiscal Técnico Titular</option>
              <option>Fiscal Técnico Suplente</option>
              <option>Fiscal Administrativo Titular</option>
              <option>Fiscal Administrativo Suplente</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Nome Completo do Servidor</label>
            <input type="text" placeholder="Ex: GERMAN CANO" value={colaborador} onChange={e => setColaborador(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm uppercase" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">E-mail Institucional (@sop.rs.gov.br)</label>
            <input type="email" placeholder="nome.sobrenome@sop.rs.gov.br" value={servidorEmail} onChange={e => setServidorEmail(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm font-mono" />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-bg-hover">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-bg-hover text-text-secondary text-sm font-semibold rounded hover:bg-bg-hover transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="px-4 py-2 bg-sop-green text-white text-sm font-bold rounded hover:bg-sop-green/90 transition-colors shadow-sm disabled:opacity-50">
              {salvando ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-save mr-1"></i>}
              {fiscalEdit ? 'Atualizar Portaria' : 'Designar Servidor'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}