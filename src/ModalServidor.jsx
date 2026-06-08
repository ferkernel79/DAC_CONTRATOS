import React, { useState } from 'react';
import { salvarServidor } from './useFirestore';

function ModalServidor({ onClose }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim() || !email.trim()) {
      setErro("Nome e E-mail são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      await salvarServidor({ nome, email, telefone });
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-bg-hover rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        
        <div className="p-4 border-b border-bg-hover flex justify-between items-center bg-white/5 border-l-4 border-l-sop-green">
          <h3 className="text-md font-bold text-text-primary flex items-center gap-2">
            <i className="fas fa-user-plus text-sop-green"></i> Cadastrar Servidor (Fiscal)
          </h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-sop-red">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && <div className="p-3 bg-sop-red/20 border border-sop-red text-sop-red text-xs font-bold rounded">{erro}</div>}

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nome Completo</label>
            <input 
              type="text" required value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: JOÃO DA SILVA SILVEIRA"
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">E-mail Institucional (Chave Única)</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Ex: joao-silva@sop.rs.gov.br"
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm font-mono text-lowercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Telefone / Ramal</label>
            <input 
              type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
              placeholder="Ex: (51) 3288-0000"
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-green text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-bg-hover">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-text-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-sop-green text-white rounded text-xs font-bold hover:bg-sop-green/90 transition-colors">
              {loading ? "Salvando..." : "Registrar Servidor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// CORREÇÃO CIRÚRGICA: Força a exportação padrão de forma isolada e explícita no rodapé do arquivo
export default ModalServidor;