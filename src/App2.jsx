import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './useAuth';
import LoginView from './LoginView';
import ContratosView from './ContratosView';
import FornecedoresView from './FornecedoresView';
import UsuariosView from './UsuariosView'; // Nova View de acessos
import DashboardView from './DashboardView';
import { excluirContratosEmMassa, importarContratosCSV } from './useFirestore';



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
          {/* PAINEL TEMPORÁRIO DE EXCLUSÃO EM MASSA */}
{perfil === 'ADMINISTRADOR' && (
  <div className="p-3 border-t border-bg-hover flex flex-col gap-2">
    <button
      type="button"
      onClick={async () => {
        // COLOQUE AQUI A LISTA EXATA DOS PROAS ALUCINADOS (ENTRE ASPAS, SEPARADOS POR VÍRGULA)
        const proasParaExcluir = [
          "18/2200-0001402-9",
          "19/2200-0001235-6",
          "19/2200-0002041-3",
          "20/2200-0000976-5",
          "21/2200-0001302-3",
          "21/2200-0001460-7",
          "21/2200-0001850-5",
          "22/2200-0000554-9",
          "22/2200-0001135-2",
          "22/2200-0001140-9",
          "22/2200-0001145-0",
          "22/2200-0001149-2",
          "22/2200-0001150-6",
          "22/2200-0001151-4",
          "22/2200-0001153-0",
          "22/2200-0001155-7",
          "22/2200-0001156-5",
          "22/2200-0001158-1",
          "22/2200-0001383-2",
          "22/2200-0001552-3",
          "22/2200-0001554-0",
          "22/2200-0002444-6",
          "22/2200-0002570-1",
          "22/2200-0003001-2",
          "22/2200-0003058-6",
          "22/2200-0003158-2",
          "22/2200-0003264-3",
          "23/2200-0000078-0",
          "23/2200-0000915-9",
          "23/2200-0001222-3",
          "23/2200-0001918-9",
          "23/2200-0001968-5",
          "23/2200-0001974-0",
          "23/2200-0002157-4",
          "23/2200-0002166-3",
          "23/2200-0002167-1",
          "23/2200-0002169-8",
          "23/2200-0002170-1",
          "23/2200-0002172-8",
          "23/2200-0002173-6",
          "23/2200-0002175-2",
          "23/2200-0002176-0",
          "23/2200-0002177-9",
          "23/2200-0002178-7",
          "23/2200-0002181-7",
          "23/2200-0002182-5",
          "23/2200-0002184-1",
          "23/2200-0002186-8",
          "23/2200-0002187-6",
          "23/2200-0002190-6",
          "23/2200-0002191-4",
          "23/2200-0002193-0",
          "23/2200-0002195-7",
          "23/2200-0002197-3",
          "23/2200-0002198-1",
          "23/2200-0002201-5",
          "23/2200-0002202-3",
          "23/2200-0002204-0",
          "23/2200-0002936-2",
          "23/2200-0003024-5",
          "23/2200-0003444-7",
          "23/2200-0003780-2",
          "24/2200-0000074-9",
          "24/2200-0000282-6",
          "24/2200-0000285-0",
          "24/2200-0000288-5",
          "24/2200-0000290-7",
          "24/2200-0000291-5",
          "24/2200-0000293-1",
          "24/2200-0000788-7",
          "25/2200-0000552-9"          
        ];

        const confirmar = window.confirm(
          `ALERTA VERMELHO: Você está prestes a excluir PERMANENTEMENTE ${proasParaExcluir.length} contrato(s) e todos os seus aditivos e fiscais vinculados. Deseja prosseguir?`
        );

        if (confirmar) {
          try {
            alert("Iniciando exclusão em lote. Por favor, aguarde...");
            const processados = await excluirContratosEmMassa(proasParaExcluir);
            alert(`Limpeza finalizada! ${processados} contratos foram completamente apagados do Firebase.`);
            window.location.reload(); // Recarrega a grade com a base limpa
          } catch (err) {
            alert("Erro na exclusão: " + err.message);
          }
        }
      }}
      className="w-full py-2 bg-sop-red/10 hover:bg-sop-red text-sop-red hover:text-white rounded text-[11px] font-black uppercase tracking-wider transition-all border border-sop-red/20 flex items-center justify-center gap-2"
    >
      <i className="fas fa-dumpster-fire"></i>
      {!menuRetraido && <span>Excluir PROAs Fantasmas</span>}
    </button>
  </div>
)}  

{/* PAINEL ADMINISTRATIVO: IMPORTADOR DE CSV BLINDADO */}
{perfil === 'ADMINISTRADOR' && (
  <div className="p-3 border-t border-bg-hover flex flex-col gap-2 bg-sop-blue/5 rounded-md m-2">
    <span className="text-[10px] font-bold uppercase tracking-wider text-sop-blue block mb-1">
      Carga de Dados DAC
    </span>
    
    <label className="w-full py-2 bg-sop-blue/10 hover:bg-sop-blue text-sop-blue hover:text-white rounded text-[11px] font-black uppercase tracking-wider transition-all border border-sop-blue/20 flex items-center justify-center gap-2 cursor-pointer text-center">
      <i className="fas fa-file-upload"></i>
      <span>Selecionar Planilha CSV</span>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files[0];
          if (!arquivo) return;

          const leitor = new FileReader();
          leitor.onload = async (evento) => {
            const textoCompleto = evento.target.result;
            const linhas = textoCompleto.split(/\r?\n/);
            if (linhas.length < 2) {
              alert("O arquivo está vazio ou não possui cabeçalho.");
              return;
            }

            // Captura e sanitiza os cabeçalhos (Remove aspas e espaços invisíveis de quebra de codificação)
            const cabecalhos = linhas[0].split(';').map(c => c.trim().replace(/"/g, '').replace(/^\uFEFF/, ''));
            const listaContratosProntos = [];

            for (let i = 1; i < linhas.length; i++) {
              if (!linhas[i].trim()) continue;
              
              const colunas = linhas[i].split(';').map(col => col.trim().replace(/"/g, ''));
              const objContrato = {};
              
              cabecalhos.forEach((cabecalho, index) => {
                if (cabecalho) {
                  objContrato[cabecalho] = colunas[index] || "";
                }
              });

              listaContratosProntos.push(objContrato);
            }

            const confirmar = window.confirm(
              `Identificamos ${listaContratosProntos.length} contratos válidos nesta planilha. Deseja realizar a importação limpa para o Firebase?`
            );

            if (confirmar) {
              try {
                alert("Processando linhas e injetando dados na base...");
                const salvos = await importarContratosCSV(listaContratosProntos);
                alert(`Sucesso total! ${salvos} contratos foram importados e higienizados de forma correta.`);
                window.location.reload();
              } catch (erro) {
                alert("Erro ao importar planilha: " + erro.message);
              }
            }
          };
          
          leitor.readAsText(arquivo, 'UTF-8');
        }}
      />
    </label>
  </div>
)}
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