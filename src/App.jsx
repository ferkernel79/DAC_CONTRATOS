import React, { useState } from 'react';
import { AuthProvider, useAuth } from './useAuth';
import LoginView from './LoginView';
import ContratosView from './ContratosView';
import FornecedoresView from './FornecedoresView';
import UsuariosView from './UsuariosView'; // Nova View de acessos

function PainelPrincipalSOP() {
  const { usuarioLogado, perfil, logout } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('contratos'); // 'contratos', 'fornecedores', 'usuarios'

  return (
    <div className="flex h-screen w-screen bg-bg-body text-text-primary overflow-hidden font-sans">
      
      {/* BARRA LATERAL (SIDEBAR) DA DAC */}
      <aside className="w-64 bg-bg-surface border-r border-bg-hover flex flex-col justify-between shrink-0">
        <div>
          {/* Topo da Sidebar */}
          <div className="p-5 border-b border-bg-hover flex items-center gap-3">
            <div className="p-2 bg-sop-blue/10 rounded-lg text-sop-blue">
              <i className="fas fa-layer-group text-lg"></i>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">DAC / SOP</h1>
              <p className="text-[10px] text-text-secondary uppercase tracking-widest">Controle de Contratos</p>
            </div>
          </div>

          {/* Identificação do Servidor Logado */}
          <div className="p-4 mx-3 my-4 bg-white/5 rounded-lg border border-bg-hover space-y-1">
            <div className="text-xs font-bold truncate uppercase" title={usuarioLogado?.nome}>
              {usuarioLogado?.nome || 'Servidor'}
            </div>
            <div className="text-[10px] text-text-muted font-mono truncate">{usuarioLogado?.email}</div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-sop-blue/20 text-sop-blue uppercase">
              {perfil}
            </div>
          </div>

          {/* Menu de Navegação */}
          <nav className="px-3 space-y-1">
            <button 
              onClick={() => setAbaAtiva('contratos')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${abaAtiva === 'contratos' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
            >
              <i className="fas fa-file-contract w-5 text-center"></i> Gestão de Contratos
            </button>
            <button 
              onClick={() => setAbaAtiva('fornecedores')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${abaAtiva === 'fornecedores' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
            >
              <i className="fas fa-building w-5 text-center"></i> Fornecedores
            </button>

            {/* TRAVA VISUAL INTERNA: A aba de Usuários só renderiza no menu se o perfil for ADMINISTRADOR */}
            {perfil === 'ADMINISTRADOR' && (
              <button 
                onClick={() => setAbaAtiva('usuarios')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${abaAtiva === 'usuarios' ? 'bg-sop-blue text-white' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
              >
                <i className="fas fa-users-cog w-5 text-center"></i> Controle de Usuários
              </button>
            )}
          </nav>
        </div>

        {/* Rodapé da Sidebar - Botão Sair */}
        <div className="p-3 border-t border-bg-hover">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-sop-red hover:bg-sop-red/10 transition-colors"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO DINÂMICO */}
      <main className="flex-1 h-full overflow-hidden flex flex-col">
        {abaAtiva === 'contratos' && <ContratosView />}
        {abaAtiva === 'fornecedores' && <FornecedoresView />}
        {abaAtiva === 'usuarios' && perfil === 'ADMINISTRADOR' && <UsuariosView />}
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