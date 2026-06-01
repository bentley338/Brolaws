import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Terminal from './components/Terminal';
import TelegramConfig from './components/TelegramConfig';
import AgentChat from './components/AgentChat';
import { apiRequest } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/api/status');
      setStatus(data);
    } catch (e) {
      console.error("Failed to load status details:", e);
    }
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

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        botOnline={status ? status.botOnline : false} 
      />
      <main style={{ flex: 1, height: '100vh', overflow: 'hidden', background: 'transparent' }}>
        {renderContent()}
      </main>
    </div>
  );
}
