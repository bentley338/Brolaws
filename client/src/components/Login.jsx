import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('brolaws_session_token', data.token);
        onLoginSuccess();
      } else {
        setError(data.message || 'Waduh bro, password lu salah!');
      }
    } catch (err) {
      setError('Gagal terhubung ke server Brolaws.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '20px',
      background: 'var(--bg-primary)'
    }}>
      <form 
        onSubmit={handleSubmit}
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          border: '1px solid var(--border-glass-glow)',
          boxShadow: '0 0 40px rgba(16, 185, 129, 0.05)'
        }}
      >
        {/* Animated Icon Header */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-mint))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--glow-mint)',
          animation: 'pulse-glow 2.5s infinite'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Brolaws Gateway</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Otorisasi sandi lu buat masuk ke panel server otonom.</p>
        </div>

        {error && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: 'rgba(248, 113, 113, 0.06)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'var(--status-offline)',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div style={{ width: '100%' }}>
          <label>Password Admin</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password admin lu..."
            disabled={loading}
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="btn-primary"
          style={{ width: '100%', marginTop: '8px' }}
        >
          {loading ? 'Verifikasi...' : 'Masuk Panel, Bro!'}
        </button>
      </form>
    </div>
  );
}
