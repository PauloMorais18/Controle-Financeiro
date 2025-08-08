import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Valores fixos de login
    const usuarioPadrao = 'user@test.com';
    const senhaPadrao = '12345';

    if (email === usuarioPadrao && senha === senhaPadrao) {
      localStorage.setItem('user', 'true');
      navigate('/dashboard');
    } else {
      setErro('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-500">
      <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Senha</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          {erro && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-center">
              {erro}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            Entrar
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          Não tem uma conta? <a href="/cadastro" className="text-blue-600 font-semibold hover:underline">Cadastre-se aqui</a>
        </p>
      </div>
    </div>
  );
}
