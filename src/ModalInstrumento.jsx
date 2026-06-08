import React, { useState } from 'react';
import { adicionarInstrumento } from './useFirestore';
import { Timestamp } from 'firebase/firestore';

export default function ModalInstrumento({ contratoId, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('Contrato');
  const [itemAditivado, setItemAditivado] = useState('Prazo');
  const [identificacao, setIdentificacao] = useState('');
  const [valor, setValor] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  const isTermoAditivo = tipo === 'Termo Aditivo';
  const exigePrazo = tipo === 'Contrato' || (isTermoAditivo && (itemAditivado === 'Prazo' || itemAditivado === 'Prazo e Valor'));
  const exigeValor = tipo === 'Contrato' || tipo === 'Apostilamento' || (isTermoAditivo && (itemAditivado === 'Valor' || itemAditivado === 'Prazo e Valor'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataTimestamp = dataFim ? Timestamp.fromDate(new Date(`${dataFim}T12:00:00`)) : null;
      
      const dados = {
        tipo,
        identificacao,
        observacoes,
        valorContrato: valor ? parseFloat(valor.replace(',', '.')) : null,
        fimDoContrato: dataTimestamp,
        itemAditivado: isTermoAditivo ? itemAditivado : null
      };

      await adicionarInstrumento(contratoId, dados);
      onSuccess(); 
      onClose(); 
    } catch (error) {
      console.error("Erro ao adicionar instrumento:", error);
      alert("Falha ao salvar o instrumento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-bg-hover rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        
        <div className="p-4 border-b border-bg-hover flex justify-between items-center bg-white/5 border-l-4 border-l-sop-yellow">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <i className="fas fa-file-invoice-dollar text-sop-yellow"></i> Registar Instrumento
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-sop-red transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Tipo de Instrumento</label>
              <select value={tipo} onChange={e => { setTipo(e.target.value); setDataFim(''); setValor(''); }} className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all">
                <option value="Contrato">Contrato (Inicial)</option>
                <option value="Termo Aditivo">Termo Aditivo</option>
                <option value="Apostilamento">Apostilamento</option>
                <option value="Rescisão">Rescisão</option>
              </select>
            </div>
            
            {isTermoAditivo ? (
              <div className="animate-fade-in-up">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 text-sop-yellow">Item Aditivado</label>
                <select value={itemAditivado} onChange={e => setItemAditivado(e.target.value)} className="w-full p-2.5 bg-bg-body border border-sop-yellow/30 text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all">
                  <option value="Prazo">Prazo</option>
                  <option value="Valor">Valor</option>
                  <option value="Prazo e Valor">Prazo e Valor</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Nº / Identificação</label>
                <input type="text" required placeholder="Ex: 01/2026" value={identificacao} onChange={e => setIdentificacao(e.target.value)} className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all" />
              </div>
            )}
          </div>

          {isTermoAditivo && (
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Nº / Identificação do Aditivo</label>
              <input type="text" required placeholder="Ex: 1º TA" value={identificacao} onChange={e => setIdentificacao(e.target.value)} className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className={!exigePrazo ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Fim do Contrato</label>
              <input type="date" required={exigePrazo} value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all [color-scheme:dark]" />
            </div>
            <div className={!exigeValor ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Valor do Contrato (R$)</label>
              <input type="number" step="0.01" required={exigeValor} placeholder="0.00" value={valor} onChange={e => setValor(e.target.value)} className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Observações</label>
            <textarea maxLength="255" rows="2" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Registe informações adicionais..." className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow transition-all resize-none"></textarea>
            <div className="text-right text-[10px] text-text-muted mt-1">{observacoes.length}/255</div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-bg-hover mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-sop-yellow text-bg-body rounded text-sm font-bold hover:bg-sop-yellow/90 transition-colors disabled:opacity-50">
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Registar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}