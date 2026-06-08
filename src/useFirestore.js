import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, addDoc, deleteDoc, updateDoc, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

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
export const removerInstrumento = async (contratoId, instrumentoId, perfilLogado) => {
  verificarPermissaoExclusao(perfilLogado);
  const instRef = doc(db, 'contratos', contratoId, 'instrumentos', instrumentoId);
  await deleteDoc(instRef);
  await atualizarStatusContrato(contratoId);
};