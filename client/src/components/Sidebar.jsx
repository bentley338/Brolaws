import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, botOnline, onLogout, username }) {
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
        marginBottom: '20px',
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

      {/* User profile Identity panel */}
      <div className="user-profile" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        padding: '12px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)'
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-mint))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          color: '#000',
          fontSize: '0.95rem',
          textTransform: 'uppercase',
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
        }}>
          {username ? username.charAt(0) : 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {username || 'Brolaws User'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Aktif (Privat)
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
                background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid var(--accent-mint)' : '3px solid transparent',
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
              <span style={{ color: isActive ? 'var(--accent-mint)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout Action Button */}
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderLeft: '3px solid transparent',
            borderRadius: '0 8px 8px 0',
            color: 'var(--status-offline)',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            outline: 'none',
            marginBottom: '16px'
          }}
          className="sidebar-tab"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--status-offline)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          Keluar (Logout)
        </button>
      )}

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
