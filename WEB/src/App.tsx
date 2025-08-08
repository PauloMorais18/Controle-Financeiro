import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';

// Esta função simula a checagem de autenticação.
// A rota raiz (/) agora redireciona para a tela de login se o usuário não estiver autenticado.
const isAuthenticated = () => {
  return !!localStorage.getItem('user');
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota Raiz (/) - Redireciona para o login ou dashboard */}
        <Route path="/" element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

        {/* Rotas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        
        {/* Rota Protegida */}
        <Route
          path="/dashboard"
          element={isAuthenticated() ? <DashboardPage /> : <Navigate to="/login" />}
        />
        
      </Routes>
    </Router>
  );
}

export default App;
