import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Menu Lateral */}
      <div className="w-64 bg-gray-800 text-white flex flex-col p-4">
        <div className="text-2xl font-bold mb-8">Controle Financeiro</div>
        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <a href="/dashboard" className="block p-2 rounded hover:bg-gray-700">
                Dashboard
              </a>
            </li>
            <li>
              <a href="#" className="block p-2 rounded hover:bg-gray-700">
                Relatórios
              </a>
            </li>
            <li>
              <a href="#" className="block p-2 rounded hover:bg-gray-700">
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
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <p>Bem-vindo ao seu painel de controle financeiro!</p>
        <div className="mt-8 bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-semibold mb-4">Em breve, aqui estarão seus gráficos e transações.</h2>
        </div>
      </div>
    </div>
  );
}
