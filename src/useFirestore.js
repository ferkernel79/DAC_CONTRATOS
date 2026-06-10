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

// MANTER APENAS ESTA VERSÃO CONSOLIDADA COM SEGURANÇA NO SEU useFirestore.js:
export const removerInstrumento = async (contratoId, instrumentoId) => {
  try {
    // 1. Captura o e-mail do usuário que está logado no momento
    const emailAtual = auth.currentUser?.email;
    if (!emailAtual) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    // 2. Busca o perfil correspondente na coleção 'usuarios'
    const userRef = doc(db, 'usuarios', emailAtual.toLowerCase().trim());
    const userSnap = await getDoc(userRef);
    const perfil = userSnap.data()?.perfil?.toUpperCase()?.trim();

    // 3. Validação de Segurança da DAC: Impede operadores comuns de apagarem o histórico
    if (perfil !== 'ADMINISTRADOR') {
      throw new Error("ACESSO NEGADO: Apenas Administradores podem excluir instrumentos contratuais.");
    }

    // 4. Executa a exclusão na subcoleção de aditivos
    const instRef = doc(db, 'contratos', contratoId, 'instrumentos', instrumentoId);
    await deleteDoc(instRef);
    
    // 5. GATILHO CRÍTICO: Aciona a nova calculadora linear para abater o valor/prazo do contrato pai
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
    
    // 1. Pega os dados brutos de nascimento do contrato
    const contratoSnap = await getDoc(contratoRef);
    if (!contratoSnap.exists()) return;
    const cDados = contratoSnap.data();

    // Ponto de partida original (Garantia caso não existam aditivos ainda)
    let valorCalculado = parseFloat(cDados.valorOriginal || cDados.valor || 0);
    
    let dataNascimentoRaw = cDados.dataVigenciaOriginal || cDados.fimDoContrato || cDados.dataVigencia || null;
    let dataCalculadaObj = dataNascimentoRaw ? (dataNascimentoRaw.toDate ? dataNascimentoRaw.toDate() : new Date(dataNascimentoRaw)) : null;

    let houveRescisao = false;

    // 2. Varre os instrumentos: O valor informado SUBSTITUI o anterior (imutabilidade linear)
    const snapshot = await getDocs(instRef);
    
    // Convertemos o snapshot em array e ordenamos por data de criação (ou ID) para garantir a ordem cronológica dos fatos
    const docsOrdenados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Se houver campo criadoEm, usamos para garantir a esteira correta de evolução do contrato
    docsOrdenados.sort((a, b) => {
      const timeA = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
      const timeB = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
      return timeA - timeB;
    });

    docsOrdenados.forEach((inst) => {
      const valInst = parseFloat(inst.valor || 0);

      // NOVA REGRA SIMPLIFICADA: Se marcou que altera valor (seja aditivo ou supressão),
      // o valor do instrumento passa a ser o NOVO VALOR REAL do contrato.
      if (inst.alteracoes?.valor || inst.alteracoes?.supressao || inst.tipo === 'Contrato') {
        if (valInst > 0) {
          valorCalculado = valInst; // Substituição direta e pura!
        }
      } else if (!inst.alteracoes && valInst > 0) {
        // Retrocompatibilidade para dados legados do CSV
        valorCalculado = valInst;
      }

      // Regra de Prazo: Se o instrumento alterou o prazo e trouxe nova data, ela substitui a linha do tempo
      if (inst.alteracoes?.prazo && inst.dataVigencia) {
        dataCalculadaObj = inst.dataVigencia.toDate ? inst.dataVigencia.toDate() : new Date(inst.dataVigencia);
      } else if (!inst.alteracoes && inst.dataVigencia) {
        // Retrocompatibilidade
        dataCalculadaObj = inst.dataVigencia.toDate ? inst.dataVigencia.toDate() : new Date(inst.dataVigencia);
      }

      // Termo de Rescisão: Encerra o contrato imediatamente na data estipulada
      if (inst.tipo === 'Termo de Rescisão') {
        houveRescisao = true;
        if (inst.dataVigencia) {
          dataCalculadaObj = inst.dataVigencia.toDate ? inst.dataVigencia.toDate() : new Date(inst.dataVigencia);
        }
      }
    });

    // 3. Recalcula o Estágio obrigatório baseado na fotografia final
    let diasRestantes = null;
    let statusFinal = 'NÃO ATRIBUÍDO';

    if (dataCalculadaObj) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const venc = new Date(dataCalculadaObj);
      venc.setHours(0, 0, 0, 0);

      const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
      diasRestantes = diff;

      if (houveRescisao || diff < 0) {
        statusFinal = 'NÃO VIGENTE';
      } else if (diff <= 90) {
        statusFinal = `ALERTA (${diff} DIAS)`;
      } else {
        statusFinal = 'VIGENTE';
      }
    }

    // 4. Grava a verdade atualizada na raiz do contrato pai
    await updateDoc(contratoRef, {
      valorTotal: valorCalculado,
      vigenciaOficial: dataCalculadaObj,
      diasRestantes: diasRestantes,
      statusContrato: statusFinal,
      atualizadoEm: new Date()
    });

    console.log(`[DAC] Contrato ${contratoId} recalculado por substituição. Novo teto: R$ ${valorCalculado}`);

  } catch (error) {
    console.error("Erro no motor de substituição: ", error);
  }
};

// MANTER APENAS ESTA VERSÃO NO SEU useFirestore.js:
export const adicionarInstrumento = async (contratoId, instrumento) => {
  try {
    const instRef = collection(db, 'contratos', contratoId, 'instrumentos');
    await addDoc(instRef, { ...instrumento, criadoEm: new Date() });
    
    // Esse é o gatilho que faz a mágica de somar/subtrair e recalcular o estágio
    await sincronizarPrazosEValores(contratoId); 
  } catch (error) {
    throw error;
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