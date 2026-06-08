import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Busca o papel (role) e o nome do usuário no Firestore
        const docRef = doc(db, 'usuarios', user.email.toLowerCase().trim());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const dados = docSnap.data();
          setUsuarioLogado({ email: user.email, uid: user.uid, ...dados });
          setPerfil(dados.perfil); // 'ADMINISTRADOR' ou 'OPERADOR'
        } else {
          setUsuarioLogado({ email: user.email, uid: user.uid, nome: "Usuário Sem Cadastro", perfil: "OPERADOR" });
          setPerfil("OPERADOR");
        }
      } else {
        setUsuarioLogado(null);
        setPerfil(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
  const logout = () => signOut(auth);

  // Validação e ativação do Primeiro Acesso
  const realizarPrimeiroAcesso = async (email, senha) => {
    const emailLimpo = email.toLowerCase().trim();
    const docRef = doc(db, 'usuarios', emailLimpo);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Este e-mail corporativo não está pré-autorizado pela DAC.");
    }

    const dados = docSnap.data();
    if (dados.status === 'Ativo') {
      throw new Error("Este usuário já realizou o primeiro acesso. Use a tela de login.");
    }

    // Cria a credencial oficial no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
    
    // Atualiza o status no banco de dados para Ativo
    await updateDoc(docRef, {
      status: 'Ativo',
      uid: userCredential.user.uid,
      ativadoEm: new Date()
    });

    return userCredential.user;
  };

  return (
    <AuthContext.Provider value={{ usuarioLogado, perfil, login, logout, realizarPrimeiroAcesso, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);