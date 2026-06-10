import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  onSnapshot,
  deleteField,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';

// --- ESCUDO ANTI-UNDEFINED (REGRA DE OURO) ---
const limparDados = (obj) => {
  const objLimpo = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      objLimpo[key] = value;
    }
  }
  return objLimpo;
};

// --- HOOKS DE ESCUTA EM TEMPO REAL ---

export function useContratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'contratos'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dados = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setContratos(dados);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Sem permissão ou falha de ligação. Verifique as regras de segurança.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { contratos, loading, error };
}

export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'fornecedores'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dados = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setFornecedores(dados);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Falha ao carregar fornecedores. Verifique as permissões.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { fornecedores, loading, error };
}

// --- MOTOR DE RECÁLCULO DE INSTRUMENTOS (BLINDADO E RESILIENTE) ---
export const atualizarStatusContrato = async (contratoId) => {
  const instRef = collection(db, 'contratos', contratoId, 'instrumentos');
  const snap = await getDocs(instRef);
  
  let maxData = null;
  let maxTimestamp = null;
  let temRescisao = false;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.tipo === 'Rescisão') temRescisao = true;

    if (data.fimDoContrato) {
      const ts = data.fimDoContrato.toMillis();
      if (!maxTimestamp || ts > maxTimestamp) {
        maxTimestamp = ts;
        maxData = data.fimDoContrato;
      }
    }
  });

  let novaSituacao = 'Ativo';
  if (temRescisao) novaSituacao = 'Rescindido';
  else if (!maxData) novaSituacao = 'Sem vigência definida';

  let novoEstagio = 'Sem Instrumentos';
  if (maxData) {
    const dataVigencia = new Date(maxTimestamp);
    dataVigencia.setHours(0,0,0,0);
    const dataAtual = new Date();
    dataAtual.setHours(0,0,0,0);
    const dataMais90 = new Date(dataAtual);
    dataMais90.setDate(dataMais90.getDate() + 90);

    if (dataVigencia > dataMais90) novoEstagio = 'Vigente';
    else if (dataVigencia >= dataAtual && dataVigencia <= dataMais90) novoEstagio = 'Vencendo';
    else if (dataVigencia < dataAtual) novoEstagio = 'Não vigente';
  }

  const contratoRef = doc(db, 'contratos', contratoId);
  try {
    // Tenta atualizar assumindo que a capa já existe
    await updateDoc(contratoRef, limparDados({
      situacao: novaSituacao,
      estagio: novoEstagio,
      vigenciaOficial: maxData || null
    }));
  } catch (error) {
    // Se a capa não existir, cria o documento básico em modo merge para não quebrar a carga
    await setDoc(contratoRef, limparDados({
      proaOriginal: contratoId.replace(/(\d{2})(\d{4})(\d{7})(\d{1})/, '$1/$2-$3-$4'),
      situacao: novaSituacao,
      estagio: novoEstagio,
      vigenciaOficial: maxData || null,
      objeto: "Contrato Inicial Semeado via Histórico de Instrumentos"
    }), { merge: true });
  }
};

// --- CRUD CONTRATOS ---
export const adicionarContrato = async (dadosContrato) => {
  const docId = dadosContrato.proaOriginal.replace(/[^a-zA-Z0-9]/g, '');
  const contratoRef = doc(db, 'contratos', docId);
  
  const dadosSeguros = limparDados({
    situacao: 'Sem vigência definida',
    estagio: 'Sem Instrumentos',
    ...dadosContrato
  });

  await setDoc(contratoRef, dadosSeguros, { merge: true });
};

export const editarContrato = async (contratoId, dadosAtualizados) => {
  const contratoRef = doc(db, 'contratos', contratoId);
  const dadosSeguros = limparDados(dadosAtualizados);

  await runTransaction(db, async (transaction) => {
    const contratoDoc = await transaction.get(contratoRef);
    if (!contratoDoc.exists()) {
      throw new Error("O contrato não existe na base de dados.");
    }
    transaction.update(contratoRef, dadosSeguros);
  });
};

// --- CRUD INSTRUMENTOS ---
export const adicionarInstrumento = async (contratoId, dadosInstrumento) => {
  const instRef = collection(db, 'contratos', contratoId, 'instrumentos');
  const docRef = await addDoc(instRef, limparDados(dadosInstrumento));
  await atualizarStatusContrato(contratoId);
  return docRef;
};
// --- FUNÇÃO PARA ALTERAR UM INSTRUMENTO EXISTENTE ---
export const editarInstrumento = async (contratoId, instrumentoId, dadosAtualizados) => {
  try {
    const instRef = doc(db, 'contratos', contratoId, 'instrumentos', instrumentoId);
    
    // Atualiza os dados do instrumento na subcoleção
    await updateDoc(instRef, {
      ...dadosAtualizados,
      atualizadoEm: new Date()
    });

    // DISPARO CRÍTICO: Recalcula a vigência oficial e o valor do contrato pai
    await sincronizarPrazosEValores(contratoId);

  } catch (error) {
    console.error("Erro ao editar instrumento no Firestore:", error);
    throw error;
  }
};

// --- FUNÇÃO PARA ALTERAR UM FISCAL EXISTENTE ---
export const editarFiscal = async (contratoId, fiscalId, dadosAtualizados) => {
  try {
    const fiscalRef = doc(db, 'contratos', contratoId, 'fiscais', fiscalId);
    
    await updateDoc(fiscalRef, {
      ...dadosAtualizados,
      atualizadoEm: new Date()
    });
    
    console.log("Fiscal atualizado com sucesso");
  } catch (error) {
    console.error("Erro ao editar fiscal no Firestore:", error);
    throw error;
  }
};

export const removerFiscal = async (contratoId, fiscalId) => {
  const fiscalRef = doc(db, 'contratos', contratoId, 'fiscais', fiscalId);
  return await deleteDoc(fiscalRef);
};

// --- CRUD FORNECEDORES ---
export const salvarFornecedor = async (dadosFornecedor) => {
  const docId = dadosFornecedor.cnpj.replace(/[^0-9]/g, '');
  if (docId.length !== 14 && docId.length !== 11) {
    throw new Error("O identificador deve conter exatamente 14 dígitos (CNPJ) ou 11 dígitos (CPF).");
  }
  const fornRef = doc(db, 'fornecedores', docId);
  const dadosSeguros = limparDados({
    cnpj: docId,
    nome: dadosFornecedor.nome.toUpperCase().trim(),
    email: dadosFornecedor.email?.toLowerCase().trim() || null,
    telefone: dadosFornecedor.telefone?.trim() || null,
    atualizadoEm: new Date()
  });
  await setDoc(fornRef, dadosSeguros, { merge: true });
};


// --- HOOK DE ESCUTA EM TEMPO REAL DE SERVIDORES ---
export function useServidores() {
  const [servidores, setServidores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'servidores'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dados = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setServidores(dados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { servidores, loading };
}

// --- CRUD SERVIDORES (CHAVE PRIMÁRIA = EMAIL) ---
export const salvarServidor = async (dadosServidor) => {
  const emailId = dadosServidor.email.toLowerCase().trim();
  if (!emailId.includes('@')) {
    throw new Error("E-mail inválido para chave primária.");
  }
  
  const servidorRef = doc(db, 'servidores', emailId);
  const dadosSeguros = limparDados({
    email: emailId,
    nome: dadosServidor.nome.toUpperCase().trim(),
    telefone: dadosServidor.telefone?.trim() || null,
    atualizadoEm: new Date()
  });

  await setDoc(servidorRef, dadosSeguros, { merge: true });
};

export const removerServidor = async (emailId) => {
  const servidorRef = doc(db, 'servidores', emailId);
  await deleteDoc(servidorRef);
};

// --- ATUALIZAÇÃO DA EQUIPE: ADICIONA FISCAL APENAS VINCULANDO O SERVIDOR ---
export const adicionarFiscal = async (contratoId, dadosDesignacao) => {
  if (!dadosDesignacao.funcao) {
    throw new Error("A função é obrigatória.");
  }

  // Mantém a regra de ouro anterior: ID único por função para sobrescrever automaticamente
  const docId = dadosDesignacao.funcao
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '_')
    .replace(/__+/g, '_');

  const fiscalRef = doc(db, 'contratos', contratoId, 'fiscais', docId);

  // Gravamos as informações desnormalizadas do servidor para exibição imediata e performática na grid
  const dadosSeguros = limparDados({
    servidorEmail: dadosDesignacao.servidorEmail.toLowerCase().trim(),
    colaborador: dadosDesignacao.colaborador.toUpperCase().trim(), // Nome do servidor
    funcao: dadosDesignacao.funcao.trim(),
    dataPortaria: dadosDesignacao.dataPortaria || null,
    designadoEm: new Date()
  });

  await setDoc(fiscalRef, dadosSeguros);
};

// --- HOOK DE ESCUTA EM TEMPO REAL DE USUÁRIOS ---
export function useUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'usuarios'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dados = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setUsuarios(dados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { usuarios, loading };
}

// --- CADASTRO/PRÉ-AUTORIZAÇÃO DE USUÁRIOS (APENAS ADMIN) ---
export const salvarUsuarioPreAutorizado = async (dados, perfilLogado) => {
  if (perfilLogado !== 'ADMINISTRADOR') {
    throw new Error("Operação negada: Apenas ADMINISTRADORES podem gerenciar usuários.");
  }

  const emailId = dados.email.toLowerCase().trim();
  const userRef = doc(db, 'usuarios', emailId);

  await setDoc(userRef, {
    email: emailId,
    nome: dados.nome.toUpperCase().trim(),
    perfil: dados.perfil, // 'ADMINISTRADOR' ou 'OPERADOR'
    status: dados.status || 'Pendente',
    criadoEm: new Date()
  }, { merge: true });
};

// --- TRAVA DE SEGURANÇA MÁXIMA NAS EXCLUSÕES ---
const verificarPermissaoExclusao = (perfilLogado) => {
  if (perfilLogado !== 'ADMINISTRADOR') {
    throw new Error("ACESSO NEGADO: Operadores não possuem permissão para excluir registros.");
  }
};

// Atualize a sua função de remover fornecedor adicionando a trava:
export const removerFornecedor = async (fornecedorId, perfilLogado) => {
  verificarPermissaoExclusao(perfilLogado);
  const fornRef = doc(db, 'fornecedores', fornecedorId);
  await deleteDoc(fornRef);
};

// Atualize a sua função de remover instrumento adicionando a trava:
export const removerInstrumento = async (contratoId, instrumentoId) => {
  try {
    // 1. Captura o e-mail do usuário que está logado no momento
    const emailAtual = auth.currentUser?.email;
    if (!emailAtual) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    // 2. Busca o perfil correspondente na coleção 'usuarios' (forçando caixa baixa)
    const userRef = doc(db, 'usuarios', emailAtual.toLowerCase().trim());
    const userSnap = await getDoc(userRef);
    
    // Captura o perfil e normaliza para maiúsculo
    const perfil = userSnap.data()?.perfil?.toUpperCase()?.trim();

    // 3. Validação do disjuntor de segurança do Frontend
    if (perfil !== 'ADMINISTRADOR') {
      throw new Error("ACESSO NEGADO: Operadores não possuem permissão para excluir registros.");
    }

    // 4. Se passou pela trava, executa a exclusão na subcoleção
    const instRef = doc(db, 'contratos', contratoId, 'instrumentos', instrumentoId);
    await deleteDoc(instRef);
    
    // 5. Recalcula os prazos e valores totais do contrato pai
    await sincronizarPrazosEValores(contratoId);

  } catch (error) {
    console.error("Falha na validação de exclusão:", error);
    throw error;
  }
};

// --- MOTOR DE REGRAS DE NEGÓCIO DA DAC/SOP ---
export const sincronizarPrazosEValores = async (contratoId) => {
  try {
    const contratoRef = doc(db, 'contratos', contratoId);
    const instRef = collection(db, 'contratos', contratoId, 'instrumentos');
    const snapshot = await getDocs(instRef);

    const contratoSnap = await getDoc(contratoRef);
    if (!contratoSnap.exists()) return;
    
    const dadosContrato = contratoSnap.data();
    
    // 1. MARCO ZERO DO VALOR: Puxa o valor base histórico do contrato
    let valorAcumulado = parseFloat(dadosContrato.valorOriginal || dadosContrato.valor || 0);
    
    // 2. MARCO ZERO DA DATA: Busca por todas as chaves possíveis do CSV (incluindo fimDoContrato)
    let dataOriginalRaw = dadosContrato.dataVigenciaOriginal || 
                           dadosContrato.fimDoContrato || 
                           dadosContrato.dataVigencia || 
                           dadosContrato.vigenciaOficial || 
                           null;

    // Converte o marco zero da data para um Objeto Date comparável
    let dataMaiorVigenciaObj = null;
    if (dataOriginalRaw) {
      dataMaiorVigenciaObj = dataOriginalRaw.toDate ? dataOriginalRaw.toDate() : new Date(dataOriginalRaw);
    }

    let houveRescisao = false;

    // 3. PROCESSAMENTO DOS ADITIVOS
    snapshot.forEach((docInst) => {
      const inst = docInst.data();
      const vInst = parseFloat(inst.valor || 0);

      // Regra Financeira: Acréscimo ou Supressão
      if (inst.alteracoes?.supressao === true) {
        valorAcumulado -= vInst; // Se for check de supressão, SUBTRAI do contrato
      } else if (inst.alteracoes?.valor === true || inst.tipo === 'Contrato') {
        valorAcumulado += vInst; // Se for check de valor ou contrato novo, SOMA
      } else if (!inst.alteracoes && vInst > 0) {
        // Retrocompatibilidade para registros antigos do CSV
        valorAcumulado += vInst;
      }

      // Regra de Prazo: Só estica a corda se o aditivo trouxer uma data superior
      if (inst.dataVigencia) {
        const dataInstObj = inst.dataVigencia.toDate ? inst.dataVigencia.toDate() : new Date(inst.dataVigencia);
        
        if (!dataMaiorVigenciaObj || dataInstObj > dataMaiorVigenciaObj) {
          dataMaiorVigenciaObj = dataInstObj;
        }
      }

      // Disjuntor de Rescisão: Força o encerramento na data do termo
      if (inst.tipo === 'Termo de Rescisão') {
        houveRescisao = true;
        if (inst.dataVigencia) {
          dataMaiorVigenciaObj = inst.dataVigencia.toDate ? inst.dataVigencia.toDate() : new Date(inst.dataVigencia);
        }
      }
    });

    // 4. RECALCULO DOS DIAS RESTANTES E DO ESTÁGIO
    let diasRestantes = null;
    let statusContrato = 'NÃO ATRIBUÍDO';

    if (dataMaiorVigenciaObj) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      dataMaiorVigenciaObj.setHours(0, 0, 0, 0);

      const diffTime = dataMaiorVigenciaObj - hoje;
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (houveRescisao || diasRestantes < 0) {
        statusContrato = 'NÃO VIGENTE';
      } else if (diasRestantes <= 90) {
        statusContrato = `ALERTA (${diasRestantes} DIAS)`;
      } else {
        statusContrato = 'VIGENTE';
      }
    }

    // 5. SALVAMENTO DA ATUALIZAÇÃO CONSOLIDADA NO PAI
    await updateDoc(contratoRef, {
      valorTotal: valorAcumulado,
      vigenciaOficial: dataMaiorVigenciaObj, // Guarda como Timestamp nativo do Firebase
      diasRestantes: diasRestantes,
      statusContrato: statusContrato,
      atualizadoEm: new Date()
    });

    console.log(`Contrato ${contratoId} sincronizado com sucesso! Novo Valor: R$ ${valorAcumulado}`);

  } catch (error) {
    console.error("Erro crítico na sincronização de prazos e valores:", error);
  }
};

// --- FUNÇÃO PARA TOCAR O FLAG REVISADO RAPIDAMENTE VIA GRID ---
export const alternarRevisadoContrato = async (contratoId, statusAtual) => {
  const contratoRef = doc(db, 'contratos', contratoId);
  await updateDoc(contratoRef, {
    revisado: !statusAtual,
    atualizadoEm: new Date()
  });
};

// --- FUNÇÃO PARA TOCAR O FLAG EM RENOVAÇÃO VIA MODAL/GRID ---
export const alternarRenovacaoContrato = async (contratoId, statusAtual) => {
  const contratoRef = doc(db, 'contratos', contratoId);
  await updateDoc(contratoRef, {
    emRenovacao: !statusAtual,
    atualizadoEm: new Date()
  });
};

export const executarFaxinaTabelaContratos = async () => {
  try {
    const contratosRef = collection(db, 'contratos');
    const snapshot = await getDocs(contratosRef);
    
    let totalProcessados = 0;

    // Roda a esteira de atualização em paralelo para ir super rápido
    const tarefas = snapshot.docs.map(async (docSnapshot) => {
      const docRef = doc(db, 'contratos', docSnapshot.id);
      
      // 1. Remove os resquícios do campo estático antigo
      await updateDoc(docRef, {
        estagio: deleteField(),
        estágio: deleteField()
      });

      // 2. DISPARO DE RECONSTRUÇÃO: Força o motor a recalcular o status real 
      // baseado nos instrumentos existentes na subcoleção
      await sincronizarPrazosEValores(docSnapshot.id);
      
      totalProcessados++;
    });

    await Promise.all(tarefas);
    return totalProcessados;

  } catch (error) {
    console.error("Erro na sincronização em massa:", error);
    throw error;
  }
};