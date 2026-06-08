import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { adicionarContrato, editarContrato } from './useFirestore';

export default function ModalContrato({ onClose, contratoEdit }) {
  const [proa, setProa] = useState(contratoEdit?.proaOriginal || '');
  const [fpe, setFpe] = useState(contratoEdit?.fpe || '');
  const [objeto, setObjeto] = useState(contratoEdit?.objeto || '');
  const [descricao, setDescricao] = useState(contratoEdit?.descricao || '');
  const [departamento, setDepartamento] = useState(contratoEdit?.departamento || '');
  const [fornecedorCnpj, setFornecedorCnpj] = useState(contratoEdit?.fornecedorCnpj || '');
  
  // --- NOVOS CAMPOS DESTE CICLO ---
  const [dataVigencia, setDataVigencia] = useState(() => {
    if (contratoEdit?.vigenciaOficial) {
      const date = contratoEdit.vigenciaOficial.toDate ? contratoEdit.vigenciaOficial.toDate() : new Date(contratoEdit.vigenciaOficial);
      return date.toISOString().split('T')[0]; // Formata para o input type="date" (YYYY-MM-DD)
    }
    return '';
  });
  const [classificacao, setClassificacao] = useState(contratoEdit?.classificacao || '');
  const [tipoServico, setTipoServico] = useState(contratoEdit?.tipoServico || '');

  const [fornecedores, setFornecedores] = useState([]);
  const [loadingForn, setLoadingForn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erroReal, setErroReal] = useState(null);

  useEffect(() => {
    async function fetchFornecedores() {
      try {
        const snap = await getDocs(collection(db, 'fornecedores'));
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFornecedores(lista);
      } catch (error) {
        console.error("Erro ao buscar fornecedores:", error);
      } finally {
        setLoadingForn(false);
      }
    }
    fetchFornecedores();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroReal(null);

    if (!proa.trim()) {
      setErroReal("O número do PROA é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const dadosFornecedorObj = fornecedores.find(f => f.cnpj === fornecedorCnpj);
      
      // Trata a string do calendário transformando em objeto de Data limpo
      let dateObj = null;
      if (dataVigencia) {
        const [ano, mes, dia] = dataVigencia.split('-');
        dateObj = new Date(ano, mes - 1, dia);
        dateObj.setHours(0,0,0,0);
      }

      const contratoPayload = {
        proaOriginal: proa.trim(),
        fpe: fpe.trim() || undefined,
        objeto: objeto.trim() || undefined,
        descricao: descricao.trim() || undefined,
        departamento: departamento.trim() || undefined,
        fornecedorCnpj: fornecedorCnpj || undefined,
        fornecedorNome: dadosFornecedorObj?.nome || undefined,
        // Sincroniza a entrada com o motor de vigência da DAC
        vigenciaOficial: dateObj || undefined,
        classificacao: classificacao || undefined,
        tipoServico: tipoServico || undefined
      };

      if (contratoEdit) {
        await editarContrato(contratoEdit.id, contratoPayload);
      } else {
        await adicionarContrato(contratoPayload);
      }

      onClose();
    } catch (error) {
      console.error("Erro ao salvar contrato:", error);
      setErroReal(error.message || "Falha ao gravar os dados do contrato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-bg-hover rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
        
        <div className="p-4 border-b border-bg-hover flex justify-between items-center bg-white/5 border-l-4 border-l-sop-blue">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <i className="fas fa-file-contract text-sop-blue"></i>
            {contratoEdit ? 'Alterar Capa do Contrato' : 'Cadastrar Novo Contrato'}
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-sop-red transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {erroReal && (
            <div className="p-4 bg-sop-red/20 border-l-4 border-sop-red text-sop-red text-sm font-bold rounded">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              ALERTA DE SISTEMA: {erroReal}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Número do PROA <span className="text-sop-red">*</span></label>
              <input 
                type="text" 
                required 
                disabled={!!contratoEdit}
                placeholder="Ex: 24/2200-0000000-0" 
                value={proa} 
                onChange={e => setProa(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all disabled:opacity-50" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Código FPE</label>
              <input 
                type="text" 
                placeholder="Ex: 2024/021200" 
                value={fpe} 
                onChange={e => setFpe(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Data de Vigência</label>
              <input 
                type="date" 
                value={dataVigencia} 
                onChange={e => setDataVigencia(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Classificação</label>
              <select 
                value={classificacao} 
                onChange={e => setClassificacao(e.target.value)}
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all"
              >
                <option value="">Selecione...</option>
                <option value="Locação de Imóvel">Locação de Imóvel</option>
                <option value="Prestação de Serviço">Prestação de Serviço</option>
                <option value="Tecnologia da Informação">Tecnologia da Informação (TI)</option>
                <option value="Obras / Engenharia">Obras / Engenharia</option>
                <option value="Fornecimento de Bens">Fornecimento de Bens</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Tipo de Serviço</label>
              <select 
                value={tipoServico} 
                onChange={e => setTipoServico(e.target.value)}
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all"
              >
                <option value="">Selecione...</option>
                <option value="Serviço Continuado">Serviço Continuado</option>
                <option value="Serviço Não continuado">Serviço Não continuado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Objeto resumido</label>
              <input 
                type="text" 
                placeholder="Ex: Locação de veículos, Software, etc." 
                value={objeto} 
                onChange={e => setObjeto(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Departamento / CROP</label>
              <input 
                type="text" 
                placeholder="Ex: SOP, 3ª CROP, DOP, DBC" 
                value={departamento} 
                onChange={e => setDepartamento(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Fornecedor Associado</label>
            <select 
              value={fornecedorCnpj} 
              onChange={e => setFornecedorCnpj(e.target.value)}
              disabled={loadingForn}
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all disabled:opacity-50"
            >
              <option value="">Selecione uma empresa cadastrada...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.cnpj}>{f.nome} ({f.cnpj})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Descrição Completa do Escopo</label>
            <textarea 
              rows="3"
              placeholder="Descreva detalhadamente o contrato..." 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all resize-none" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-bg-hover mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-sop-blue text-white rounded text-sm font-bold hover:bg-sop-blue/90 transition-colors disabled:opacity-50">
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Salvar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}