import React, { useState } from 'react';
import { useAuth } from './useAuth';

export default function LoginView() {
  const { login, realizarPrimeiroAcesso } = useAuth();
  const [modo, setModo] = useState('login'); // 'login' ou 'primeiro_acesso'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      if (modo === 'login') {
        await login(email, senha);
      } else {
        if (senha.length < 6) {
          throw new Error("A senha deve conter no mínimo 6 caracteres.");
        }
        if (senha !== confirmarSenha) {
          throw new Error("As senhas digitadas não coincidem.");
        }
        await realizarPrimeiroAcesso(email, senha);
        alert("Conta ativada com sucesso! Bem-vindo ao sistema de contratos da DAC.");
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErro("E-mail ou senha incorretos.");
      } else {
        setErro(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-body flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-bg-hover w-full max-w-sm rounded-xl shadow-2xl p-6 space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-sop-blue/10 rounded-full text-sop-blue text-2xl mb-2">
            <i className={modo === 'login' ? "fas fa-shield-alt" : "fas fa-user-key"}></i>
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">
            {modo === 'login' ? 'Controle de Contratos SOP' : 'Ativar Primeiro Acesso'}
          </h2>
          <p className="text-xs text-text-secondary">Secretaria de Obras Públicas - DAC</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && <div className="p-3 bg-sop-red/20 border-l-4 border-sop-red text-sop-red text-xs font-semibold rounded">{erro}</div>}
          
          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">E-mail Corporativo</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@sop.rs.gov.br"
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded text-sm font-mono outline-none focus:border-sop-blue transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              {modo === 'login' ? 'Senha de Acesso' : 'Crie sua Senha'}
            </label>
            <input 
              type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
              className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded text-sm outline-none focus:border-sop-blue transition-all"
            />
          </div>

          {modo === 'primeiro_acesso' && (
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Confirme a Senha</label>
              <input 
                type="password" required value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="••••••••"
                className="w-full p-2.5 bg-bg-body border border-bg-hover text-text-primary rounded text-sm outline-none focus:border-sop-blue transition-all"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-sop-blue text-white font-bold rounded text-sm hover:bg-sop-blue/90 transition-all shadow-md">
            {loading ? "Processando..." : modo === 'login' ? 'Entrar no Sistema' : 'Ativar Minha Conta'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-bg-hover">
          <button 
            type="button" 
            onClick={() => { setModo(modo === 'login' ? 'primeiro_acesso' : 'login'); setErro(null); }}
            className="text-xs text-sop-blue font-semibold hover:underline"
          >
            {modo === 'login' ? 'Sou servidor novo, fazer Primeiro Acesso' : 'Voltar para a tela de Login'}
          </button>
        </div>
      </div>
    </div>
  );
}