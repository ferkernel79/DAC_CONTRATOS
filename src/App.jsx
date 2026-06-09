import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './useAuth';
import LoginView from './LoginView';
import ContratosView from './ContratosView';
import FornecedoresView from './FornecedoresView';
import UsuariosView from './UsuariosView'; // Nova View de acessos
import DashboardView from './DashboardView';

function PainelPrincipalSOP() {
  const [menuRetraido, setMenuRetraido] = useState(false);
  const { usuarioLogado, perfil, logout } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('dashboard'); // 'ABA INICIAL
  // --- CONTROLE DE TEMA (CLARO / ESCURO) ---
const [temaEscuro, setTemaEscuro] = useState(() => {
  // Se o usuário já usou o app antes, puxa a preferência dele. Se não, começa no Claro
  return localStorage.getItem('dac-tema') === 'dark';
});

// Efeito que injeta a classe .dark direto na raiz do navegador
useEffect(() => {
  if (temaEscuro) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('dac-tema', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('dac-tema', 'light');
  }
}, [temaEscuro]);

  return (
    <div className="flex h-screen w-screen bg-bg-body overflow-hidden">
      
      {/* MENU LATERAL RETRÁTIL */}
      <aside 
        className={`h-full bg-bg-surface border-r border-bg-hover flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          menuRetraido ? 'w-[70px]' : 'w-[260px]'
        }`}
      >
        {/* CABEÇALHO DO MENU: LOGO + BOTÃO HAMBÚRGUER */}
        <div className={`flex items-center px-4 h-[60px] border-b border-bg-hover ${menuRetraido ? 'justify-center' : 'justify-between'}`}>
          {!menuRetraido && (
            <div className="flex items-center gap-2 font-black text-sop-blue tracking-wider text-sm animate-fade-in">
              <i className="fas fa-building text-sop-green"></i>
              <span>SOP / DAC</span>
            </div>
          )}
          
          {/* O BOTÃO HAMBÚRGUER */}
          <button 
            onClick={() => setMenuRetraido(!menuRetraido)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            title={menuRetraido ? "Expandir Menu" : "Recolher Menu"}
          >
            <i className={`fas ${menuRetraido ? 'fa-bars' : 'fa-arrow-left'}`}></i>
          </button>
        </div>
  
        {/* LINKS DE NAVEGAÇÃO */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          
          {/* BOTÃO 1: DASHBOARD */}
          <button 
            onClick={() => setAbaAtiva('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              abaAtiva === 'dashboard' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover text-text-primary'
            } ${menuRetraido ? 'justify-center' : ''}`}
            title="Painel Gerencial"
          >
            <i className="fas fa-chart-pie w-5 text-center text-base"></i>
            {!menuRetraido && <span className="truncate">Painel Gerencial</span>}
          </button>

          {/* BOTÃO 2: CONTRATOS */}
          <button 
            onClick={() => setAbaAtiva('contratos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              abaAtiva === 'contratos' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover text-text-primary'
            } ${menuRetraido ? 'justify-center' : ''}`}
            title="Gestão de Contratos"
          >
            <i className="fas fa-file-contract w-5 text-center text-base"></i>
            {!menuRetraido && <span className="truncate">Contratos</span>}
          </button>

          {/* BOTÃO 3: FORNECORES (Recuperado e Blindado) */}
          <button 
            onClick={() => setAbaAtiva('fornecedores')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              abaAtiva === 'fornecedores' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover text-text-primary'
            } ${menuRetraido ? 'justify-center' : ''}`}
            title="Cadastro de Fornecedores"
          >
            <i className="fas fa-store w-5 text-center text-base"></i>
            {!menuRetraido && <span className="truncate">Fornecedores</span>}
          </button>

          {/* BOTÃO 4: USUÁRIOS (Apenas se o perfil logado for ADMIN) */}
          {perfil === 'ADMINISTRADOR' && (
            <button 
              onClick={() => setAbaAtiva('usuarios')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                abaAtiva === 'usuarios' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover text-text-primary'
              } ${menuRetraido ? 'justify-center' : ''}`}
              title="Controle de Usuários"
            >
              <i className="fas fa-users-cog w-5 text-center text-base"></i>
              {!menuRetraido && <span className="truncate">Usuários</span>}
            </button>
          )}

        </nav>
        {/* ALTERNADOR DE TEMA CLARO/ESCURO */}
        <div className={`p-3 border-t border-bg-hover flex ${menuRetraido ? 'justify-center' : 'justify-between items-center'}`}>
          {!menuRetraido && (
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {temaEscuro ? 'Ambiente Escuro' : 'Ambiente Claro'}
            </span>
          )}
          
          <button
            type="button"
            onClick={() => setTemaEscuro(!temaEscuro)}
            className={`p-2.5 rounded-lg text-base transition-all ${
              temaEscuro 
                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                : 'bg-sop-blue/10 text-sop-blue hover:bg-sop-blue/20'
            }`}
            title={temaEscuro ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {/* Ícone muda dinamicamente: Sol para o claro, Lua para o escuro */}
            <i className={`fas ${temaEscuro ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
        {/* RODAPÉ DO MENU (Fica limpo com foto ou apenas o ícone de logout quando encolhido) */}
        <div className="p-3 border-t border-bg-hover flex justify-center">
          <button className="text-text-muted hover:text-sop-red p-2" title="Sair do Sistema">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
  
      </aside>
  
      {/* ÁREA DE CONTEÚDO PRINCIPAL (Se expande automaticamente) */}
      <main className="flex-1 h-full overflow-hidden flex flex-col bg-bg-body">
        {abaAtiva === 'dashboard' && <DashboardView />}
        {abaAtiva === 'contratos' && <ContratosView />}
        {abaAtiva === 'fornecedores' && <FornecedoresView />}
        {abaAtiva === 'usuarios' && perfil === 'ADMINISTRADOR' && <UsuariosView />}
        {/* ... restante das abas ... */}
      </main>
  
    </div>
  );
}

function ConteudoApp() {
  const { usuarioLogado, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-body flex flex-col gap-3 items-center justify-center text-text-primary">
        <i className="fas fa-circle-notch fa-spin text-3xl text-sop-blue"></i>
        <span className="text-xs text-text-secondary uppercase tracking-widest font-semibold">Carregando chaves de segurança...</span>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login/primeiro acesso
  if (!usuarioLogado) {
    return <LoginView />;
  }

  // Se estiver logado, renderiza o layout com o menu lateral montado acima
  return <PainelPrincipalSOP />;
}

export default function App() {
  return (
    <AuthProvider>
      <ConteudoApp />
    </AuthProvider>
  );
}