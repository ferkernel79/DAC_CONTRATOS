import React, { useState } from 'react';
import { useUsuarios, salvarUsuarioPreAutorizado } from './useFirestore';
import { useAuth } from './useAuth';

export default function UsuariosView() {
  const { perfil } = useAuth();
  const { usuarios, loading } = useUsuarios();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfilUsuario, setPerfilUsuario] = useState('OPERADOR');
  const [erro, setErro] = useState(null);

  if (perfil !== 'ADMINISTRADOR') {
    return <div className="p-6 text-sop-red font-bold">Acesso Negado: Área restrita à Administração.</div>;
  }

  const handleCadastrar = async (e) => {
    e.preventDefault();
    setErro(null);

    if (!email.toLowerCase().trim().endsWith('@sop.rs.gov.br') && !email.includes('@')) {
      setErro("Insira um e-mail corporativo válido.");
      return;
    }

    try {
      await salvarUsuarioPreAutorizado({ nome, email, perfil: perfilUsuario }, perfil);
      setNome('');
      setEmail('');
      alert("Sucesso! E-mail pré-autorizado. O usuário já pode realizar o Primeiro Acesso.");
    } catch (err) {
      setErro(err.message);
    }
  };

  if (loading) return <div className="p-6">Carregando controle de acessos...</div>;

  return (
    <div className="p-[25px] flex flex-col md:flex-row gap-6 h-full bg-bg-body overflow-hidden">
      {/* Formulário de Autorização */}
      <div className="bg-bg-surface border border-bg-hover rounded-xl p-6 w-full md:w-80 shrink-0 h-fit shadow-lg">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <i className="fas fa-user-plus text-sop-blue"></i> Autorizar E-mail
        </h3>
        <form onSubmit={handleCadastrar} className="space-y-4">
          {erro && <div className="p-2.5 bg-sop-red/20 border border-sop-red text-sop-red text-xs rounded">{erro}</div>}
          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Nome do Servidor</label>
            <input 
              type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: FULANO DE TAL"
              className="w-full p-2 bg-bg-body border border-bg-hover text-text-primary rounded text-sm uppercase outline-none focus:border-sop-blue"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">E-mail Corporativo</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@sop.rs.gov.br"
              className="w-full p-2 bg-bg-body border border-bg-hover text-text-primary rounded text-sm font-mono outline-none focus:border-sop-blue"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Perfil de Acesso</label>
            <select 
              value={perfilUsuario} onChange={e => setPerfilUsuario(e.target.value)}
              className="w-full p-2 bg-bg-body border border-bg-hover text-text-primary rounded text-sm outline-none focus:border-sop-blue"
            >
              <option value="OPERADOR">OPERADOR (DAC)</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total)</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-sop-blue text-white rounded text-xs font-bold hover:bg-sop-blue/90 transition-colors">
            Pré-Autorizar Acesso
          </button>
        </form>
      </div>

      {/* Lista de Controle */}
      <div className="flex-1 bg-bg-surface border border-bg-hover rounded-xl shadow-lg flex flex-col overflow-hidden h-full">
        <div className="px-5 py-3 border-b border-bg-hover bg-white/5 text-sm font-bold text-text-primary">
          Controle de Usuários Cadastrados
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-body text-text-secondary uppercase text-[10px] tracking-wider border-b border-bg-hover sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Nome</th>
                <th className="py-2.5 px-4">E-mail</th>
                <th className="py-2.5 px-4">Perfil</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-bg-hover hover:bg-bg-hover">
                  <td className="py-3 px-4 font-semibold text-text-primary uppercase">{u.nome}</td>
                  <td className="py-3 px-4 font-mono text-text-secondary">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.perfil === 'ADMINISTRADOR' ? 'bg-sop-purple/20 text-sop-purple' : 'bg-sop-blue/20 text-sop-blue'}`}>
                      {u.perfil}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Ativo' ? 'bg-sop-green/20 text-sop-green' : 'bg-sop-yellow/20 text-sop-yellow-dark'}`}>
                      {u.status === 'Ativo' ? 'ATIVO' : 'PENDENTE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}