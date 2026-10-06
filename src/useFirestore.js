import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// 1. HOOK PRINCIPAL: LISTAGEM DE CONTRATOS EM TEMPO REAL
// ============================================================================
export const useContratos = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'contratos'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));
        setContratos(lista);
        setLoading(false);
      },
      (err) => {
        console.error("Erro no onSnapshot de contratos:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { contratos, loading, error };
};

// ============================================================================
// 2. OPERAÇÕES BÁSICAS DE CONTRATOS (CRUD)
// ============================================================================
export const adicionarContrato = async (dadosContrato) => {
  try {
    const proaLimpo = (dadosContrato.proaOriginal || dadosContrato.proa || dadosContrato.id || '').trim();
    const idSeguro = proaLimpo.replace(/\//g, '-');
    const contratoRef = doc(db, 'contratos', idSeguro);

    await setDoc(contratoRef, {
      ...dadosContrato,
      id: idSeguro,
      proaOriginal: proaLimpo,
      proa: proaLimpo,
      emRenovacao: dadosContrato.emRenovacao || false,
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }, { merge: true });

    return idSeguro;
  } catch (error) {
    console.error("Erro ao adicionar contrato:", error);
    throw error;
  }
};

// --- ATUALIZAR/EDITAR CONTRATO EXISTENTE ---
export const editarContrato = async (id, dadosAtualizados) => {
  try {
    const idSeguro = String(id).trim().replace(/\//g, '-');
    const contratoRef = doc(db, 'contratos', idSeguro);

    await setDoc(contratoRef, {
      ...dadosAtualizados,
      atualizadoEm: new Date()
    }, { merge: true });

    return idSeguro;
  } catch (error) {
    console.error("Erro ao editar contrato:", error);
    throw error;
  }
};

export const alternarRevisadoContrato = async (id, estadoAtual) => {
  try {
    const idSeguro = String(id).trim().replace(/\//g, '-');
    const docRef = doc(db, 'contratos', idSeguro);
    await setDoc(docRef, {
      revisado: !estadoAtual,
      atualizadoEm: new Date()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao alternar revisão:", error);
    throw error;
  }
};

// ============================================================================
// 3. ESTEIRA DE RENOVAÇÕES
// ============================================================================
export const alternarRenovacaoContrato = async (id, estadoAtual) => {
  try {
    // 1. Usa o id exato do documento sem tentar alterar traço/barra na rota
    const docId = String(id).trim();
    const docRef = doc(db, 'contratos', docId);

    // 2. Grava tanto no booleano quanto no timestamp
    const novoValor = !Boolean(estadoAtual);

    await setDoc(docRef, {
      emRenovacao: novoValor,
      atualizadoEm: new Date()
    }, { merge: true });

    console.log(`[RENOVAÇÃO] Documento '${docId}' atualizado para emRenovacao = ${novoValor}`);
  } catch (error) {
    console.error("Erro em alternarRenovacaoContrato:", error);
    throw error;
  }
};

export const atribuirAnalistaRenovacao = async (contratoId, nomeAnalista, observacoes = '') => {
  try {
    const docId = String(contratoId).trim();
    const contratoRef = doc(db, 'contratos', docId);

    await setDoc(contratoRef, {
      analistaRenovacao: nomeAnalista,
      observacoesRenovacao: observacoes,
      atualizadoEm: new Date()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao atribuir analista e observações:", error);
    throw error;
  }
};

// ============================================================================
// 4. SUBCOLEÇÕES: INSTRUMENTOS CONTRATUAIS
// ============================================================================
export const adicionarInstrumento = async (contratoId, dadosInstrumento) => {
  try {
    const idSeguro = String(contratoId).trim().replace(/\//g, '-');
    const novaRef = doc(collection(db, 'contratos', idSeguro, 'instrumentos'));

    await setDoc(novaRef, {
      ...dadosInstrumento,
      criadoEm: new Date()
    });

    // Atualização de vigência oficial se o instrumento alterar o termo final
    if (dadosInstrumento.dataVigencia) {
      const contratoRef = doc(db, 'contratos', idSeguro);
      await setDoc(contratoRef, {
        vigenciaOficial: dadosInstrumento.dataVigencia,
        atualizadoEm: new Date()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Erro ao adicionar instrumento:", error);
    throw error;
  }
};

export const removerInstrumento = async (contratoId, instrumentoId) => {
  try {
    const idSeguro = String(contratoId).trim().replace(/\//g, '-');
    const instRef = doc(db, 'contratos', idSeguro, 'instrumentos', instrumentoId);
    await deleteDoc(instRef);
  } catch (error) {
    console.error("Erro ao remover instrumento:", error);
    throw error;
  }
};

// ============================================================================
// 5. SUBCOLEÇÕES: FISCAIS E AUTOCOMPLETAR GLOBAL
// ============================================================================
export const adicionarFiscal = async (contratoId, dadosFiscal) => {
  try {
    const idSeguro = String(contratoId).trim().replace(/\//g, '-');
    const novaRef = doc(collection(db, 'contratos', idSeguro, 'fiscais'));

    await setDoc(novaRef, {
      ...dadosFiscal,
      criadoEm: new Date()
    });
  } catch (error) {
    console.error("Erro ao adicionar fiscal:", error);
    throw error;
  }
};

export const editarFiscal = async (contratoId, fiscalId, dadosAtualizados) => {
  try {
    const idSeguro = String(contratoId).trim().replace(/\//g, '-');
    const fiscalRef = doc(db, 'contratos', idSeguro, 'fiscais', fiscalId);

    await setDoc(fiscalRef, {
      ...dadosAtualizados,
      atualizadoEm: new Date()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao atualizar fiscal:", error);
    throw error;
  }
};

export const removerFiscal = async (contratoId, fiscalId) => {
  try {
    const idSeguro = String(contratoId).trim().replace(/\//g, '-');
    const fiscalRef = doc(db, 'contratos', idSeguro, 'fiscais', fiscalId);
    await deleteDoc(fiscalRef);
  } catch (error) {
    console.error("Erro ao remover fiscal:", error);
    throw error;
  }
};

export const obterFiscaisCadastradosGlobal = async () => {
  try {
    const contratosSnap = await getDocs(collection(db, 'contratos'));
    const mapaUnicos = new Map();

    for (const cDoc of contratosSnap.docs) {
      const fiscaisSnap = await getDocs(collection(db, 'contratos', cDoc.id, 'fiscais'));
      fiscaisSnap.forEach((fDoc) => {
        const data = fDoc.data();
        const nome = (data.colaborador || data.nome || '').trim();
        const email = (data.servidorEmail || data.email || '').trim();

        if (nome && !mapaUnicos.has(nome.toUpperCase())) {
          mapaUnicos.set(nome.toUpperCase(), {
            nome: nome.toUpperCase(),
            email: email.toLowerCase()
          });
        }
      });
    }

    return Array.from(mapaUnicos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error("Erro ao buscar histórico de fiscais:", error);
    return [];
  }
};

// ============================================================================
// 6. UTILITÁRIOS ADMINISTRATIVOS: IMPORTAÇÃO E EXCLUSÃO EM LOTE
// ============================================================================
export const importarContratosCSV = async (linhasContratos) => {
  try {
    const batch = writeBatch(db);
    let adicionados = 0;

    for (const contrato of linhasContratos) {
      const proaRaw = contrato.PROA || contrato.proa;
      if (!proaRaw) continue;

      const proaLimpo = proaRaw.trim();
      const idSeguro = proaLimpo.replace(/\//g, '-');
      const contratoRef = doc(db, 'contratos', idSeguro);

      let valorTratado = 0;
      const valorRaw = contrato.VALOR || contrato.valorOriginal || contrato.valor;
      if (valorRaw) {
        const strValor = valorRaw.toString().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        valorTratado = parseFloat(strValor) || 0;
      }

      let dataVigencia = null;
      const fimContratoRaw = contrato.FIMDOCONTRATO || contrato.fimDoContrato;
      if (fimContratoRaw && fimContratoRaw.trim() && fimContratoRaw !== 'NaN') {
        const partes = fimContratoRaw.trim().split('/');
        if (partes.length === 3) {
          dataVigencia = new Date(partes[2], partes[1] - 1, partes[0], 12, 0, 0);
        }
      }

      const dadosContrato = {
        id: idSeguro,
        proaOriginal: proaLimpo,
        proa: proaLimpo,
        fpe: (contrato.FPE || contrato.fpe || "").toString().trim(),
        objeto: (contrato.OBJETO || contrato.objeto || "").toString().trim(),
        classificacao: (contrato.CLASSIFICAÇÃO || contrato.classificacao || "Não Classificado").toString().trim(),
        tipoServico: (contrato['TIPO SERVIÇO'] || contrato.tipoServico || "Geral").toString().trim(),
        fornecedorNome: (contrato.CONTRATADA || contrato.fornecedorNome || "Não Informado").toString().trim(),
        valorOriginal: valorTratado,
        valorTotal: valorTratado,
        fimDoContrato: dataVigencia,
        emRenovacao: false,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        statusContrato: ""
      };

      batch.set(contratoRef, dadosContrato, { merge: true });
      adicionados++;
    }

    await batch.commit();
    return adicionados;
  } catch (error) {
    console.error("Erro crítico na importação do lote:", error);
    throw error;
  }
};

export const excluirContratosEmMassa = async (listaProas) => {
  try {
    let totalExcluido = 0;
    const contratosSnap = await getDocs(collection(db, 'contratos'));

    for (const proa of listaProas) {
      const proaBuscado = proa.trim();

      const docEncontrado = contratosSnap.docs.find((d) => {
        const dados = d.data();
        return (
          d.id === proaBuscado.replace(/\//g, '-') ||
          d.id === encodeURIComponent(proaBuscado) ||
          dados.proaOriginal === proaBuscado ||
          dados.proa === proaBuscado
        );
      });

      if (!docEncontrado) {
        console.warn(`PROA '${proaBuscado}' não encontrado, pulando...`);
        continue;
      }

      const idRealFirebase = docEncontrado.id;
      const contratoRef = doc(db, 'contratos', idRealFirebase);

      // Limpeza profunda de subcoleções (fiscais e instrumentos)
      const fiscaisSnap = await getDocs(collection(db, 'contratos', idRealFirebase, 'fiscais'));
      for (const fDoc of fiscaisSnap.docs) {
        await deleteDoc(fDoc.ref);
      }

      const instSnap = await getDocs(collection(db, 'contratos', idRealFirebase, 'instrumentos'));
      for (const iDoc of instSnap.docs) {
        await deleteDoc(iDoc.ref);
      }

      // Exclusão do contrato pai
      await deleteDoc(contratoRef);
      totalExcluido++;
      console.log(`[LIXEIRA] Contrato ${proaBuscado} (ID: ${idRealFirebase}) removido com histórico.`);
    }

    return totalExcluido;
  } catch (error) {
    console.error("Erro na exclusão em massa:", error);
    throw error;
  }
};
// ============================================================================
// 7. MÓDULO DE FORNECEDORES (CRUD)
// ============================================================================
export const useFornecedores = () => {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'fornecedores'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setFornecedores(lista);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar fornecedores:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { fornecedores, loading, error };
};

export const salvarFornecedor = async (dadosFornecedor) => {
  try {
    // Sanitiza CNPJ/CPF ou nome para servir de ID previsível
    const docId = (dadosFornecedor.cnpj || dadosFornecedor.id || dadosFornecedor.nome || '')
      .toString()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .trim();

    const fornecedorRef = docId 
      ? doc(db, 'fornecedores', docId) 
      : doc(collection(db, 'fornecedores'));

    await setDoc(fornecedorRef, {
      ...dadosFornecedor,
      atualizadoEm: new Date()
    }, { merge: true });

    return fornecedorRef.id;
  } catch (error) {
    console.error("Erro ao salvar fornecedor:", error);
    throw error;
  }
};

export const removerFornecedor = async (fornecedorId) => {
  try {
    const fornecedorRef = doc(db, 'fornecedores', fornecedorId);
    await deleteDoc(fornecedorRef);
  } catch (error) {
    console.error("Erro ao remover fornecedor:", error);
    throw error;
  }
};

// Alias de segurança para evitar quebras caso algum modal use excluirFornecedor
export const excluirFornecedor = removerFornecedor;

// ============================================================================
// 8. MÓDULO DE USUÁRIOS E PRÉ-AUTORIZAÇÃO (CONTROLE DE ACESSOS)
// ============================================================================
export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'usuarios'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setUsuarios(lista);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao listar usuários:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { usuarios, loading, error };
};

export const salvarUsuarioPreAutorizado = async (dadosUsuario) => {
  try {
    const emailLimpo = (dadosUsuario.email || '').trim().toLowerCase();
    if (!emailLimpo) throw new Error("E-mail institucional obrigatório.");

    const docId = emailLimpo.replace(/[^a-zA-Z0-9]/g, '_');
    const usuarioRef = doc(db, 'usuarios', docId);

    await setDoc(usuarioRef, {
      ...dadosUsuario,
      email: emailLimpo,
      atualizadoEm: new Date()
    }, { merge: true });

    return docId;
  } catch (error) {
    console.error("Erro ao salvar usuário pré-autorizado:", error);
    throw error;
  }
};

export const removerUsuarioPreAutorizado = async (usuarioId) => {
  try {
    const usuarioRef = doc(db, 'usuarios', usuarioId);
    await deleteDoc(usuarioRef);
  } catch (error) {
    console.error("Erro ao remover usuário:", error);
    throw error;
  }
};

// Aliases comuns para prevenir divergências de nomenclatura
export const salvarUsuario = salvarUsuarioPreAutorizado;
export const removerUsuario = removerUsuarioPreAutorizado;
export const excluirUsuario = removerUsuarioPreAutorizado;