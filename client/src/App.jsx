import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Terminal from './components/Terminal';
import TelegramConfig from './components/TelegramConfig';
import AgentChat from './components/AgentChat';
import Login from './components/Login';
import { apiRequest } from './utils/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('brolaws_session_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/api/status');
      setStatus(data);
    } catch (e) {
      console.error("Failed to load status details:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('brolaws_session_token');
    setIsAuthenticated(false);
    setStatus(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard status={status} refreshStatus={fetchStatus} />;
      case 'terminal':
        return <Terminal />;
      case 'chat':
        return <AgentChat />;
      case 'telegram':
        return <TelegramConfig onConfigChange={fetchStatus} />;
      default:
        return <Dashboard status={status} refreshStatus={fetchStatus} />;
    }
  };

  // Enforce secure login wall if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        botOnline={status ? status.botOnline : false} 
        onLogout={handleLogout}
      />
      <main style={{ flex: 1, height: '100vh', overflow: 'hidden', background: 'transparent' }}>
        {renderContent()}
      </main>
    </div>
  );
}
