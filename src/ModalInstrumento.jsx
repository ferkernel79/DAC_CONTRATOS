import React, { useState, useEffect } from 'react';
import { adicionarInstrumento, editarInstrumento } from './useFirestore';

export default function ModalInstrumento({ contratoId, instrumentoEdit, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('Termo Aditivo');
  const [identificacao, setIdentificacao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVigencia, setDataVigencia] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Carrega os dados caso seja uma operação de ALTERAÇÃO
  useEffect(() => {
    if (instrumentoEdit) {
      setTipo(instrumentoEdit.tipo || 'Termo Aditivo');
      setIdentificacao(instrumentoEdit.identificacao || '');
      setValor(instrumentoEdit.valor || instrumentoEdit.valorContrato || '');
      
      // Converte a data do formato Firebase/ISO para o formato aceito pelo input HTML (AAAA-MM-DD)
      const dataRaw = instrumentoEdit.dataVigencia || instrumentoEdit.fimDoContrato;
      if (dataRaw) {
        const dateObj = dataRaw.toDate ? dataRaw.toDate() : new Date(dataRaw);
        setDataVigencia(dateObj.toISOString().split('T')[0]);
      }
    }
  }, [instrumentoEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identificacao || !dataVigencia) {
      alert("Por favor, preencha a identificação e a data de vigência.");
      return;
    }

    setSalvando(true);
    try {
      const dadosForm = {
        tipo,
        identificacao,
        valor: valor ? parseFloat(valor) : 0,
        dataVigencia: new Date(dataVigencia + 'T12:00:00') // Evita fuso horário quebrando o dia
      };

      if (instrumentoEdit) {
        // Modo Edição
        await editarInstrumento(contratoId, instrumentoEdit.id, dadosForm);
      } else {
        // Modo Novo Registro
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
            {instrumentoEdit ? 'Alterar Instrumento' : 'Adicionar Instrumento'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Tipo de Instrumento</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm font-medium">
              <option>Termo Aditivo</option>
              <option>Apostilamento</option>
              <option>Contrato Original</option>
              <option>Termo de Rescisão</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-text-secondary">Identificação (Número/Ano)</label>
            <input type="text" placeholder="Ex: TA 02/2026 - Prorrogação" value={identificacao} onChange={e => setIdentificacao(e.target.value)}
              className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-text-secondary">Valor (R$)</label>
              <input type="number" step="0.01" placeholder="0.00" value={valor} onChange={e => setValor(e.target.value)}
                className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm font-mono" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-text-secondary">Vigência Final</label>
              <input type="date" value={dataVigencia} onChange={e => setDataVigencia(e.target.value)}
                className="p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-yellow text-sm font-mono" />
            </div>
          </div>

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