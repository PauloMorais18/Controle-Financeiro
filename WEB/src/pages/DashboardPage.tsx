import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-500 text-gray-800">
      {/* Menu Lateral */}
      <div className="w-64 bg-gray-800 text-white flex flex-col p-4 shadow-xl">
        <div className="text-2xl font-bold mb-8 text-white">Controle Financeiro</div>
        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <a href="/dashboard" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Dashboard
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 16.414l3.293 3.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 7.707 7.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3z" clipRule="evenodd" />
                </svg>
                Relatórios
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14.76 14.56a2 2 0 01-2.035 2.106h-3.414a2 2 0 01-2.035-2.106A.999.999 0 007 14c-1.48 0-2.883.297-4.135.82a6 6 0 002.664 3.16A14.28 14.28 0 009 18h2a14.28 14.28 0 003.471-4.02A6 6 0 0017 14c-.004-.325-.262-.605-.515-.716z" />
                </svg>
                Meus Grupos
              </a>
            </li>
          </ul>
        </nav>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition duration-300"
          >
            Sair
          </button>
        </div>
      </div>
      
      {/* Conteúdo Principal */}
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-4xl font-extrabold mb-6 text-gray-900">Dashboard</h1>
        <p className="text-xl text-gray-600 mb-8">Bem-vindo ao seu painel de controle financeiro!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-2">Resumo Mensal</h2>
            <p>Em breve, gráficos e dados aqui.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-2">Últimas Transações</h2>
            <p>Em breve, uma lista das suas transações recentes.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-2">Status dos Grupos</h2>
            <p>Em breve, informações sobre seus grupos financeiros.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
