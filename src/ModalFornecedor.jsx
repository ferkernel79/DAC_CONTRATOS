import React, { useState } from 'react';
import { salvarFornecedor } from './useFirestore';

export default function ModalFornecedor({ onClose, onSuccess, fornecedorEdit }) {
  const [cnpj, setCnpj] = useState(fornecedorEdit?.cnpj || '');
  const [nome, setNome] = useState(fornecedorEdit?.nome || '');
  const [email, setEmail] = useState(fornecedorEdit?.email || '');
  const [telefone, setTelefone] = useState(fornecedorEdit?.telefone || '');
  
  const [loading, setLoading] = useState(false);
  const [erroReal, setErroReal] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroReal(null);

    const cnpjLimpo = cnpj.replace(/[^0-9]/g, '');
    if (cnpjLimpo.length !== 14) {
      setErroReal("CNPJ Inválido. Certifique-se de preencher os 14 dígitos.");
      return;
    }

    if (!nome.trim()) {
      setErroReal("A Razão Social é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      await salvarFornecedor({
        cnpj,
        nome,
        email: email || undefined, // passa pelo filtro de segurança
        telefone: telefone || undefined
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
      setErroReal(error.message || "Falha ao gravar os dados no Firestore.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-bg-hover rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        
        <div className="p-4 border-b border-bg-hover flex justify-between items-center bg-white/5 border-l-4 border-l-sop-blue">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <i className={`fas ${fornecedorEdit ? 'fa-edit' : 'fa-building'} text-sop-blue`}></i> 
            {fornecedorEdit ? 'Alterar Fornecedor' : 'Novo Fornecedor'}
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-sop-red transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erroReal && (
            <div className="p-4 bg-sop-red/20 border-l-4 border-sop-red text-sop-red text-sm font-bold rounded">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              ALERTA DE SISTEMA: {erroReal}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">CNPJ <span className="text-sop-red">*</span></label>
            <input 
              type="text" 
              required 
              disabled={!!fornecedorEdit}
              placeholder="00.000.000/0000-00" 
              value={cnpj} 
              onChange={e => setCnpj(e.target.value)} 
              className={`w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none transition-all ${fornecedorEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-sop-blue'}`} 
            />
            {fornecedorEdit && <span className="text-[10px] text-sop-yellow mt-1 block">O CNPJ é a chave do registro e não pode ser editado.</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Razão Social / Nome Fantasia <span className="text-sop-red">*</span></label>
            <input 
              type="text" 
              required 
              placeholder="Ex: EMPRESA DE ENGENHARIA RS LTDA" 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">E-mail de Contato</label>
              <input 
                type="email" 
                placeholder="contato@empresa.com.br" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Telefone Comercial</label>
              <input 
                type="text" 
                placeholder="(51) 3288-0000" 
                value={telefone} 
                onChange={e => setTelefone(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-bg-hover mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-sop-blue text-white rounded text-sm font-bold hover:bg-sop-blue/90 transition-colors disabled:opacity-50">
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}