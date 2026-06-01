import React, { useEffect, useState, useRef } from 'react';
import { apiRequest } from '../utils/api';

export default function Dashboard({ status, refreshStatus }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screenTimestamp, setScreenTimestamp] = useState(Date.now());
  const [capturing, setCapturing] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
      refreshStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchLogs = async () => {
    try {
      const data = await apiRequest('/api/logs');
      setLogs(data);
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  };

  const captureScreen = async () => {
    setCapturing(true);
    try {
      // Run the 'ss' command directly in terminal API
      await apiRequest('/api/terminal/run', 'POST', { command: 'ss' });
      setScreenTimestamp(Date.now());
    } catch (e) {
      console.error("Failed to capture screenshot:", e);
    } finally {
      setCapturing(false);
    }
  };

  const getScreenUrl = () => {
    const token = localStorage.getItem('brolaws_session_token');
    return `/api/screenshot?token=${token}&t=${screenTimestamp}`;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor((seconds % (3600*24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? `${d}d ` : "";
    const hDisplay = h > 0 ? `${h}h ` : "";
    const mDisplay = m > 0 ? `${m}m ` : "";
    const sDisplay = s > 0 ? `${s}s` : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
  };

  const getLogStyle = (level) => {
    switch (level) {
      case 'error': return { color: 'var(--status-offline)' };
      case 'warn': return { color: 'var(--status-warning)' };
      case 'cmd': return { color: 'var(--accent-gold)', fontWeight: '600' };
      default: return { color: 'var(--accent-mint)' };
    }
  };

  if (!status) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading telemetry data...</div>
      </div>
    );
  }

  const { system, botOnline, agentOnline } = status;

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto', height: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>System Command Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor host metrics, active agent commands, and Telegram pipelines.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a
            href={`/api/agent/download?token=${localStorage.getItem('brolaws_session_token')}`}
            className="btn-primary"
            style={{ 
              padding: '10px 18px', 
              fontSize: '0.85rem', 
              fontWeight: '700', 
              textDecoration: 'none',
              borderRadius: '8px',
              boxShadow: 'var(--glow-mint)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📥 Download Agent
          </a>
          <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`status-dot ${agentOnline ? 'online' : 'offline'}`} style={{ animation: agentOnline ? 'pulse-glow 1.5s infinite' : 'none' }}></span>
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              Device Connection: {agentOnline ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`status-dot ${botOnline ? 'online' : 'offline'}`}></span>
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              Telegram Bot: {botOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Device Access Status Alert */}
      {!agentOnline && (
        <div className="glass-panel" style={{
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-warning)',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}>
              ⚠️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                PC Lu Belum Terhubung, Bro!
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Brolaws Public SaaS aman dan terisolasi. Biar AI bisa ngakses dan ngontrol PC Windows lu secara privat, lu wajib jalanin Local Agent.
              </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginTop: '8px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '16px'
          }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--accent-gold)' }}>Cara Setup Kilat (1-Click):</h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.7' }}>
                <li>Klik tombol <b>Download Brolaws Agent</b> di sebelah kanan.</li>
                <li>Pindahin file <code>brolaws-agent.js</code> ke folder kerja di PC lu.</li>
                <li>Buka CMD/Terminal di folder itu, terus jalanin perintah:
                  <code style={{ 
                    display: 'block', 
                    background: '#05070a', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    marginTop: '6px',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--accent-mint)'
                  }}>node brolaws-agent.js</code>
                </li>
              </ol>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '200px' }}>
              <a
                href={`/api/agent/download?token=${localStorage.getItem('brolaws_session_token')}`}
                className="btn-primary"
                style={{ 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  padding: '12px', 
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  boxShadow: 'var(--glow-mint)'
                }}
              >
                📥 Download Agent
              </a>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                *Sandi & token lu otomatis ter-injeksi di dalam script!
              </span>
            </div>
          </div>
        </div>
      )}

      {agentOnline && (
        <div className="glass-panel" style={{
          padding: '16px 24px',
          marginBottom: '32px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          background: 'rgba(16, 185, 129, 0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="status-dot online" style={{ animation: 'pulse-glow 1.5s infinite' }}></span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--accent-mint)' }}>
                Brolaws Device Connected
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                PC local lu udah sinkron. Brolaws AI siap nerima perintah lu kapan pun secara otonom!
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ 
              fontSize: '0.75rem', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--accent-mint)', 
              padding: '4px 8px', 
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              Remote Telemetry: Active
            </span>
          </div>
        </div>
      )}

      {/* Grid Layout for Dials & Core Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Dial Metric: CPU */}
        <div className="glass-panel glass-panel-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', position: 'relative', overflow: 'hidden' }}>
          {!agentOnline && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(10, 11, 14, 0.88)',
              backdropFilter: 'blur(2px)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              fontWeight: '600',
              gap: '6px'
            }}>
              📴 PC Client Offline
            </div>
          )}
          <CircularProgress
            percentage={system.cpu.percentage}
            label="Active CPU Load"
            color="var(--accent-gold)"
            glow="0 0 10px rgba(251, 191, 36, 0.4)"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textTransform: 'uppercase' }}>CPU Specs</span>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {system.cpu.model.replace(/\((R)\)|\((TM)\)/gi, '')}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Cores: {system.cpu.cores} threads
            </span>
          </div>
        </div>

        {/* Dial Metric: RAM */}
        <div className="glass-panel glass-panel-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', position: 'relative', overflow: 'hidden' }}>
          {!agentOnline && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(10, 11, 14, 0.88)',
              backdropFilter: 'blur(2px)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              fontWeight: '600',
              gap: '6px'
            }}>
              📴 PC Client Offline
            </div>
          )}
          <CircularProgress
            percentage={system.ram.percentage}
            label="RAM Memory Usage"
            color="var(--accent-mint)"
            glow="0 0 10px rgba(52, 211, 153, 0.4)"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Memory Capacity</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {system.ram.used} GB <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal' }}>/ {system.ram.total} GB</span>
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Free: {Math.round((system.ram.total - system.ram.used) * 10) / 10} GB
            </span>
          </div>
        </div>

        {/* Core Stats Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          {!agentOnline && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(10, 11, 14, 0.88)',
              backdropFilter: 'blur(2px)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              fontWeight: '600',
              gap: '6px'
            }}>
              📴 PC Client Offline
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Server OS</span>
              <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{system.platform} {system.release}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Architecture</span>
              <span style={{ fontWeight: 'bold' }}>{system.arch}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Uptime Counter</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-mint)' }}>{formatUptime(system.uptime)}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Live synchronization active
          </div>
        </div>
      </div>

      {/* Two-Column Event Feed & Remote Screen Layout */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
        
        {/* Left Column: Event logs feed */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px', flex: 1.2, minWidth: '320px' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Active Event Feed</h3>
            </div>
            <button
              onClick={fetchLogs}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Force Refresh
            </button>
          </div>

          <div style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            background: 'rgba(5, 7, 10, 0.4)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: '1.6'
          }}>
            {loading ? (
              <div style={{ color: 'var(--text-dark)', textAlign: 'center', padding: '40px' }}>Analyzing server output buffer...</div>
            ) : logs.length === 0 ? (
              <div style={{ color: 'var(--text-dark)', textAlign: 'center', padding: '40px' }}>No logs registered yet. Trigger a command to see events.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-dark)' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '8px',
                    fontSize: '0.75rem',
                    ...getLogStyle(log.level)
                  }}>
                    {log.level.toUpperCase()}
                  </span>
                  {log.context && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginRight: '6px' }}>
                      [{log.context}]
                    </span>
                  )}
                  <span style={{ color: '#e5e7eb' }}>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Right Column: Live Remote Screenshot Preview */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px', flex: 0.8, minWidth: '300px' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Live PC Screen View</h3>
            </div>
            <button
              onClick={captureScreen}
              disabled={capturing}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              {capturing ? 'Capturing...' : 'Capture Screen'}
            </button>
          </div>
          
          <div style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 7, 10, 0.45)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <img
              src={getScreenUrl()}
              alt="Remote PC Screen Capture"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              onLoad={(e) => {
                e.target.style.display = 'block';
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// Circular SVG Progress Component Helper
function CircularProgress({ percentage, label, color, glow }) {
  const radius = 50;
  const stroke = 6;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg height="100" width="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            stroke="rgba(255, 255, 255, 0.03)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="50"
            cy="50"
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, strokeLinecap: 'round', transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            r={normalizedRadius}
            cx="50"
            cy="50"
            filter={`drop-shadow(${glow})`}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', fontWeight: '700',
          color: 'var(--text-primary)'
        }}>
          {percentage}%
        </div>
      </div>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}
