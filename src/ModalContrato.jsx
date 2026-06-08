import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { adicionarContrato, editarContrato } from './useFirestore';

export default function ModalContrato({ onClose, contratoEdit }) {
  // --- ENGENHARIA DE RETROCOMPATIBILIDADE REVERSA ---
  const obterObjetoInicial = () => {
    if (!contratoEdit) return '';
    // O objeto real (descrição livre) veio na coluna 'descricao' no CSV
    return contratoEdit.descricao || contratoEdit.objeto || '';
  };

  const obterClassificacaoInicial = () => {
    if (!contratoEdit) return '';
    if (contratoEdit.classificacao) return contratoEdit.classificacao;
    // Se for importado do CSV e não tiver sido alterado ainda, a classificação está em 'objeto'
    if (contratoEdit.importadoDoCsv) return contratoEdit.objeto || '';
    return '';
  };

  const [proa, setProa] = useState(contratoEdit?.proaOriginal || '');
  const [fpe, setFpe] = useState(contratoEdit?.fpe || '');
  const [objeto, setObjeto] = useState(obterObjetoInicial()); // Texto livre (Objeto real)
  const [classificacao, setClassificacao] = useState(obterClassificacaoInicial()); // Dropdown
  const [tipoServico, setTipoServico] = useState(contratoEdit?.tipoServico || '');
  const [departamento, setDepartamento] = useState(contratoEdit?.departamento || '');
  const [fornecedorCnpj, setFornecedorCnpj] = useState(contratoEdit?.fornecedorCnpj || '');
  
  const [dataVigencia, setDataVigencia] = useState(() => {
    if (contratoEdit?.vigenciaOficial) {
      const date = contratoEdit.vigenciaOficial.toDate ? contratoEdit.vigenciaOficial.toDate() : new Date(contratoEdit.vigenciaOficial);
      return date.toISOString().split('T')[0];
    }
    return '';
  });

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
      
      let dateObj = null;
      if (dataVigencia) {
        const [ano, mes, dia] = dataVigencia.split('-');
        dateObj = new Date(ano, mes - 1, dia);
        dateObj.setHours(0,0,0,0);
      }

      const contratoPayload = {
        proaOriginal: proa.trim(),
        fpe: fpe.trim() || undefined,
        // Alinhamento definitivo: gravamos o texto livre em ambos para blindar a visualização
        objeto: objeto.trim() || undefined,
        descricao: objeto.trim() || undefined,
        departamento: departamento.trim() || undefined,
        fornecedorCnpj: fornecedorCnpj || undefined,
        fornecedorNome: dadosFornecedorObj?.nome || undefined,
        vigenciaOficial: dateObj || undefined,
        classificacao: classificacao || undefined,
        tipoServico: tipoServico || undefined,
        importadoDoCsv: contratoEdit?.importadoDoCsv || false
      };

      if (contratoEdit) {
        await editarContrato(contratoEdit.id, contratoPayload);
      } else {
        await adicionarContrato(contratoPayload);
      }

      onClose();
    } catch (error) {
      console.error("Erro ao salvar contrato:", error);
      setErroReal(error.message || "Falha ao gravar as alterações do contrato.");
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
            {contratoEdit ? 'Alterar Contrato' : 'Cadastrar Novo Contrato'}
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-sop-red transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {erroReal && (
            <div className="p-4 bg-sop-red/20 border-l-4 border-sop-red text-sop-red text-sm font-bold rounded">
              <i className="fas fa-exclamation-triangle mr-2"></i>ALERTA: {erroReal}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Número do PROA</label>
              <input 
                type="text" 
                required 
                disabled={!!contratoEdit}
                value={proa} 
                onChange={e => setProa(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all disabled:opacity-50 font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Código FPE</label>
              <input 
                type="text" 
                placeholder="Ex: 2024/021200" 
                value={fpe} 
                onChange={e => setFpe(e.target.value)} 
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all font-mono" 
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
                {/* Opções espelhadas com a taxonomia do CSV real para auto-seleção retroativa */}
                <option value="Serviços especializados">Serviços especializados</option>
                <option value="Locação de imóveis">Locação de imóveis</option>
                <option value="Locação de bens">Locação de bens</option>
                <option value="Telefonia">Telefonia</option>
                <option value="Obras e serviços de engenharia">Obras e serviços de engenharia</option>
                <option value="Manutenção Predial">Manutenção Predial</option>
                <option value="Serviços de Alarme e Monitoramento">Serviços de Alarme e Monitoramento</option>
                <option value="Software">Software</option>
                <option value="Serviços de TI">Serviços de TI</option>
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

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Departamento / CROP Requisitante</label>
            <input 
              type="text" 
              placeholder="Ex: SOP, 3ª CROP, DOP, DBC" 
              value={departamento} 
              onChange={e => setDepartamento(e.target.value)} 
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Fornecedor Contratado</label>
            <select 
              value={fornecedorCnpj} 
              onChange={e => setFornecedorCnpj(e.target.value)}
              disabled={loadingForn}
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all disabled:opacity-50"
            >
              <option value="">Selecione uma empresa da DAC...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.cnpj}>{f.nome} ({f.cnpj})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Objeto (Descrição Livre e Detalhada) <span className="text-sop-red">*</span></label>
            <textarea 
              rows="4"
              required
              placeholder="Digite o escopo ou objeto detalhado da contratação..." 
              value={objeto} 
              onChange={e => setObjeto(e.target.value)} 
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded-md outline-none focus:border-sop-blue transition-all resize-none font-medium" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-bg-hover mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-sop-blue text-white rounded text-sm font-bold hover:bg-sop-blue/90 transition-colors disabled:opacity-50">
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}