import React from 'react';

export default function Sidebar({ activeView, setActiveView }) {
  // O nosso array de navegação. Fácil de expandir no futuro.
  const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'contratos', icon: 'fa-file-signature', label: 'Contratos' },
    { id: 'fornecedores', icon: 'fa-building', label: 'Fornecedores' },
    { id: 'configuracoes', icon: 'fa-cog', label: 'Configurações' }
  ];

  return (
    <aside className="w-64 bg-bg-surface h-screen flex flex-col border-r border-bg-hover transition-all">
      {/* Logótipo e Departamento */}
      <div className="p-6 border-b border-bg-hover">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          <span className="text-sop-green">SOP</span>-RS
        </h1>
        <p className="text-xs text-text-secondary mt-1 font-medium tracking-wider">
          DAC MANAGER
        </p>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeView === item.id
                ? 'bg-sop-green text-white shadow-lg shadow-sop-green/20'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <i className={`fas ${item.icon} w-5 text-center`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Rodapé da Sidebar */}
      <div className="p-4 border-t border-bg-hover text-xs text-text-muted text-center">
        Divisão de Aquisições e Contratos
      </div>
    </aside>
  );
}