import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

export default function TelegramConfig({ onConfigChange }) {
  const [config, setConfig] = useState({
    telegramToken: '',
    adminChatId: '',
    geminiApiKey: '',
    safeMode: false,
    geminiModel: 'gemini-1.5-flash',
    systemPrompt: ''
  });
  
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState({ token: false, gemini: false });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiRequest('/api/settings');
      setConfig(data);
    } catch (e) {
      showStatus('Gagal memuat pengaturan dari server.', 'error');
    }
  };

  const showStatus = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
  };

  const handleToggle = () => {
    setConfig(prev => ({ ...prev, safeMode: !prev.safeMode }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await apiRequest('/api/settings', 'POST', config);
      if (result.success) {
        showStatus('Pengaturan berhasil disimpan! Bot Telegram berhasil diupdate.', 'success');
        if (onConfigChange) onConfigChange();
      } else {
        showStatus('Gagal menyimpan pengaturan: ' + result.message, 'error');
      }
    } catch (e) {
      showStatus('Gagal menghubungi server.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    if (!config.telegramToken || !config.adminChatId) {
      showStatus('Masukkan Bot Token dan Admin Chat ID untuk melakukan tes.', 'error');
      return;
    }
    setTesting(true);
    showStatus('Mengirim notifikasi tes ke Telegram...', 'info');
    try {
      const result = await apiRequest('/api/telegram/test', 'POST', {
        token: config.telegramToken,
        adminChatId: config.adminChatId
      });
      if (result.success) {
        showStatus('🔔 Tes sukses! Silakan periksa chat bot Telegram Anda.', 'success');
      } else {
        showStatus('Gagal tes bot: ' + result.message, 'error');
      }
    } catch (e) {
      showStatus('Gagal tes bot. Periksa kredensial Anda.', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto', height: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>Telegram & AI Orchestration</h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure bot credentials, security layers, and LLM reasoning pipelines.</p>
      </div>

      {/* Main Container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px' }}>
        
        {/* Settings Form Panel */}
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            System Settings
          </h2>

          {/* Toast Notification Alert */}
          {statusMessage.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
              background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : statusMessage.type === 'info' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${statusMessage.type === 'error' ? 'var(--status-offline)' : statusMessage.type === 'info' ? 'var(--accent-indigo)' : 'var(--status-online)'}`,
              color: statusMessage.type === 'error' ? 'var(--status-offline)' : statusMessage.type === 'info' ? 'var(--accent-purple)' : 'var(--status-online)',
              transition: 'all 0.3s ease'
            }}>
              {statusMessage.text}
            </div>
          )}

          {/* Bot Token field */}
          <div style={{ position: 'relative' }}>
            <label>Telegram Bot Token</label>
            <input
              type={showPassword.token ? "text" : "password"}
              value={config.telegramToken}
              onChange={(e) => setConfig({ ...config, telegramToken: e.target.value })}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwXyz"
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, token: !showPassword.token })}
              style={{
                position: 'absolute',
                right: '12px',
                top: '34px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dark)',
                cursor: 'pointer'
              }}
            >
              {showPassword.token ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Admin Chat ID field */}
          <div>
            <label>Telegram Admin Chat ID</label>
            <input
              type="text"
              value={config.adminChatId}
              onChange={(e) => setConfig({ ...config, adminChatId: e.target.value })}
              placeholder="e.g. 987654321 (Restrict execution permission)"
            />
          </div>

          {/* Gemini API Key field */}
          <div style={{ position: 'relative' }}>
            <label>Gemini API Key</label>
            <input
              type={showPassword.gemini ? "text" : "password"}
              value={config.geminiApiKey}
              onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
              placeholder="AI reasoning key (Optional - falls back to direct execution)"
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, gemini: !showPassword.gemini })}
              style={{
                position: 'absolute',
                right: '12px',
                top: '34px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dark)',
                cursor: 'pointer'
              }}
            >
              {showPassword.gemini ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Gemini Model ID field */}
          <div>
            <label>Gemini Model ID</label>
            <input
              type="text"
              value={config.geminiModel || ''}
              onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
              placeholder="e.g. gemini-1.5-flash or gemini-1.5-flash-latest"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px', display: 'block' }}>
              Dukungan standar: <code>gemini-1.5-flash</code>, <code>gemini-1.5-flash-latest</code>, atau <code>gemini-2.5-flash</code>.
            </span>
          </div>

          {/* Custom System Prompt field */}
          <div>
            <label>AI System Instructions</label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              placeholder="Configure prompt defining OpenClaw personality and commands permissions."
              rows="4"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Safe Mode Toggle switch */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', display: 'block' }}>Command Safe Mode</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blocks dangerous deletions (del, rmdir, format).</span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '12px',
                background: config.safeMode ? 'var(--status-online)' : 'var(--text-dark)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                outline: 'none'
              }}
            >
              <span style={{
                position: 'absolute',
                top: '2px',
                left: config.safeMode ? '24px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
              }}></span>
            </button>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            
            <button
              type="button"
              onClick={handleTestBot}
              disabled={testing}
              className="btn-secondary"
            >
              {testing ? 'Testing...' : 'Test Bot Connection'}
            </button>
          </div>
        </form>

        {/* Documentation / Guide Panel */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 className="text-gradient-cyan" style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            Quick Setup Manual
          </h2>

          <div style={{ fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '16px', color: '#cbd5e1' }}>
            
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontWeight: '600' }}>1. Get Telegram Bot Token</h4>
              <p style={{ fontSize: '0.85rem' }}>
                Buka Telegram dan chat ke <strong>@BotFather</strong>. Kirim perintah <code>/newbot</code> dan ikuti instruksinya. BotFather akan memberikan token API bot unik Anda.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontWeight: '600' }}>2. Find Your Chat ID</h4>
              <p style={{ fontSize: '0.85rem' }}>
                Cari bot <strong>@userinfobot</strong> di Telegram, kirim pesan apa saja, dan ia akan membalas dengan Chat ID numerik Anda. Masukkan ID ini pada formulir untuk membatasi akses eksekusi shell server agar aman.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontWeight: '600' }}>3. Enable Autonomous AI Agent</h4>
              <p style={{ fontSize: '0.85rem' }}>
                Untuk mengaktifkan model pemikiran mandiri di mana bot bisa menganalisa perintah kompleks dan mengoperasikan file secara otomatis, masukkan API Key Gemini Anda (dapatkan gratis dari Google AI Studio).
              </p>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px dashed var(--border-glass-glow)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>🔒 Security First Policy</strong>
              OpenClaw Hub mengenkripsi dan mengamankan kredensial Anda di file JSON terisolasi dalam direktori server Anda. Token tidak pernah dibagikan ke server pihak ketiga mana pun.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
