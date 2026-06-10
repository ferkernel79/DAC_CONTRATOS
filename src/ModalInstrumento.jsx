import React, { useState, useEffect } from 'react';
import { adicionarInstrumento, editarInstrumento } from './useFirestore';

export default function ModalInstrumento({ contratoId, instrumentoEdit, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('Termo Aditivo');
  const [identificacao, setIdentificacao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVigencia, setDataVigencia] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estado para seleção múltipla de alterações
  const [alteracoes, setAlteracoes] = useState({
    prazo: false,
    valor: false,
    supressao: false
  });

  // Handler para alternar os checkboxes
  const handleCheckboxChange = (campo) => {
    setAlteracoes(prev => ({ ...prev, [campo]: !prev[campo] }));
  };

  // Carrega dados se for Edição (Com validação estrita de objeto)
// Escuta as mudanças no instrumentoEdit com precisão
useEffect(() => {
  if (instrumentoEdit) {
    // MODO EDIÇÃO: Preenche com os dados do banco
    setTipo(instrumentoEdit.tipo || instrumentoEdit.tipoInstrumento || 'Termo Aditivo');
    setIdentificacao(instrumentoEdit.identificacao || instrumentoEdit.numero || instrumentoEdit.id || '');
    setObservacao(instrumentoEdit.observacao || instrumentoEdit.obs || '');
    setAlteracoes(instrumentoEdit.alteracoes || { prazo: false, valor: false, supressao: false });
    
    const vRaw = instrumentoEdit.valor !== undefined ? instrumentoEdit.valor : (instrumentoEdit.valorContrato || '');
    setValor(vRaw);
    
    const dataRaw = instrumentoEdit.dataVigencia || instrumentoEdit.fimDoContrato;
    if (dataRaw) {
      const dateObj = dataRaw.toDate ? dataRaw.toDate() : new Date(dataRaw);
      setDataVigencia(dateObj.toISOString().split('T')[0]);
    } else {
      setDataVigencia('');
    }
  } else {
    // MODO NOVO CADASTRO: Força a limpeza total dos campos
    setTipo('Termo Aditivo');
    setIdentificacao('');
    setValor('');
    setDataVigencia('');
    setObservacao('');
    setAlteracoes({ prazo: false, valor: false, supressao: false });
  }
}, [instrumentoEdit]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identificacao.trim()) {
      alert("Por favor, informe a identificação do instrumento.");
      return;
    }

    setSalvando(true);
    try {
      const dadosForm = {
        tipo,
        identificacao: identificacao.toUpperCase().trim(),
        valor: valor ? parseFloat(valor) : 0,
        alteracoes,
        observacao: observacao.trim(),
        // A data só é salva se for preenchida pelo usuário
        dataVigencia: dataVigencia ? new Date(dataVigencia + 'T12:00:00') : null 
      };

      if (instrumentoEdit) {
        await editarInstrumento(contratoId, instrumentoEdit.id, dadosForm);
      } else {
        await adicionarInstrumento(contratoId, dadosForm);
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao salvar instrumento: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-bg-surface border border-bg-hover w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in text-text-primary">
        
        <div className="px-5 py-4 bg-white/5 border-b border-bg-hover flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-file-signature text-sop-yellow"></i>
            {instrumentoEdit ? 'Alterar Instrumento' : 'Cadastrar Instrumento'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* TIPO DE INSTRUMENTO */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Tipo de Instrumento</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm font-medium">
              <option>Contrato</option>
              <option>Termo Aditivo</option>
              <option>Apostilamento</option>
              <option>Termo de Rescisão</option>
            </select>
          </div>

          {/* IDENTIFICAÇÃO */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Identificação (Texto Livre)</label>
            <input type="text" placeholder="Ex: TA 01/2026 - Prorrogação de Prazo" value={identificacao} onChange={e => setIdentificacao(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm" />
          </div>

          {/* SELEÇÃO DE ALTERAÇÕES (MÚLTIPLA SELEÇÃO) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Objeto das Alterações</label>
            <div className="grid grid-cols-3 gap-2 bg-bg-body p-3 rounded-md border border-bg-hover">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-text-primary">
                <input type="checkbox" checked={alteracoes.prazo} onChange={() => handleCheckboxChange('prazo')} className="rounded border-bg-hover text-sop-yellow focus:ring-0" />
                Prazo
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-text-primary">
                <input type="checkbox" checked={alteracoes.valor} onChange={() => handleCheckboxChange('valor')} className="rounded border-bg-hover text-sop-yellow focus:ring-0" />
                Valor (+)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-text-primary">
                <input type="checkbox" checked={alteracoes.supressao} onChange={() => handleCheckboxChange('supressao')} className="rounded border-bg-hover text-sop-yellow focus:ring-0" />
                Supressão (-)
              </label>
            </div>
          </div>

          {/* VALOR E DATA VIGÊNCIA (OPCIONAIS) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-text-secondary">Valor Impactado (R$)</label>
              <input type="number" step="0.01" placeholder="0.00" value={valor} onChange={e => setValor(e.target.value)}
                className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm font-mono" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-text-secondary">Nova Vigência Final</label>
              <input type="date" value={dataVigencia} onChange={e => setDataVigencia(e.target.value)}
                className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm font-mono" />
            </div>
          </div>

          {/* OBSERVACÃO */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Observações Contratuais</label>
            <textarea rows="3" placeholder="Insira detalhes adicionais sobre este instrumento legal..." value={observacao} onChange={e => setObservacao(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm resize-none" />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-2 flex justify-end gap-2 border-t border-bg-hover">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-bg-hover text-text-secondary text-sm font-semibold rounded hover:bg-bg-hover transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="px-4 py-2 bg-sop-yellow text-bg-body text-sm font-bold rounded hover:bg-sop-yellow/90 transition-colors shadow-sm disabled:opacity-50">
              {salvando ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-save mr-1"></i>}
              {instrumentoEdit ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}