import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, botOnline }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      )
    },
    {
      id: 'terminal',
      label: 'Terminal Console',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
      )
    },
    {
      id: 'chat',
      label: 'AI Agent Chat',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      )
    },
    {
      id: 'telegram',
      label: 'Bot Telegram',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      )
    }
  ];

  return (
    <aside className="sidebar glass-panel" style={{
      width: '260px',
      minWidth: '260px',
      height: '100vh',
      borderRadius: '0',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 10
    }}>
      <div className="logo-container" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        padding: '0 8px'
      }}>
        <div className="logo-glow" style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--glow-cyan)'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.25rem', letterSpacing: '0.03em' }}>Brolaws</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-dot ${botOnline ? 'online' : 'offline'}`}></span>
            {botOnline ? 'Bot Online' : 'Bot Offline'}
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid var(--accent-indigo)' : '3px solid transparent',
                borderRadius: '0 8px 8px 0',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.95rem',
                fontWeight: isActive ? '600' : '500',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              className="sidebar-tab"
            >
              <span style={{ color: isActive ? 'var(--accent-indigo)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{
        paddingTop: '20px',
        borderTop: '1px solid var(--border-glass)',
        fontSize: '0.8rem',
        color: 'var(--text-dark)',
        textAlign: 'center'
      }}>
        Brolaws Server v1.0.0
      </div>
    </aside>
  );
}
