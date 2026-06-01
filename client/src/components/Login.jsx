import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Sign-In Mockup State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const handleManualAuth = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = activeTab === 'login' 
      ? { username, password } 
      : { username, password, email };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (activeTab === 'login') {
          onLoginSuccess(data.token, data.username);
        } else {
          setSuccess('Registrasi berhasil! Silahkan login bro.');
          setActiveTab('login');
          setPassword('');
        }
      } else {
        setError(data.message || 'Waduh bro, proses otorisasi gagal!');
      }
    } catch (err) {
      setError('Gagal terhubung ke server Brolaws.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMockLogin = async (selectedEmail, selectedName) => {
    setLoading(true);
    setError('');
    setShowGoogleModal(false);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedEmail,
          name: selectedName || selectedEmail.split('@')[0],
          googleId: `g-${Date.now()}`
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.token, data.username);
      } else {
        setError(data.message || 'Gagal login menggunakan Google.');
      }
    } catch (err) {
      setError('Gagal menghubungkan Google Auth ke server Brolaws.');
    } finally {
      setLoading(false);
    }
  };

  const mockGoogleAccounts = [
    { name: 'Bentley Brolaw', email: 'bentley@brolaws.com' },
    { name: 'Alex Api', email: 'alex.api@gmail.com' },
    { name: 'Cyber Master', email: 'cyber.master@gmail.com' }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '20px',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background neon glows */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '350px',
        height: '350px',
        background: 'rgba(16, 185, 129, 0.04)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '400px',
        height: '400px',
        background: 'rgba(59, 130, 246, 0.04)',
        borderRadius: '50%',
        filter: 'blur(90px)',
        pointerEvents: 'none'
      }} />

      <form 
        onSubmit={handleManualAuth}
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '430px',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          border: '1px solid var(--border-glass-glow)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Animated Icon Header */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-mint))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--glow-mint)',
          animation: 'pulse-glow 2.5s infinite'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px', fontWeight: '800', letterSpacing: '0.5px' }}>Brolaws Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Operasikan PC otonom lu secara privat, aman & gaul.</p>
        </div>

        {/* Custom Glass Tabs switcher */}
        <div style={{
          display: 'flex',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          padding: '4px',
          border: '1px solid var(--border-glass)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'login' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'login' ? 'var(--accent-mint)' : 'var(--text-muted)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'register' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'register' ? 'var(--accent-mint)' : 'var(--text-muted)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Buat Akun (Register)
          </button>
        </div>

        {error && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: 'rgba(248, 113, 113, 0.06)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'var(--status-offline)',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--accent-mint)',
            textAlign: 'center'
          }}>
            ✅ {success}
          </div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username unik lu..."
              disabled={loading}
              style={{ width: '100%', marginTop: '4px' }}
              required
            />
          </div>

          {activeTab === 'register' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email (Opsional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com..."
                disabled={loading}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={activeTab === 'login' ? "Sandi rahasia lu..." : "Buat sandi yang aman..."}
              disabled={loading}
              style={{ width: '100%', marginTop: '4px' }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="btn-primary"
          style={{ width: '100%', marginTop: '8px', padding: '12px' }}
        >
          {loading ? 'Sedang Diproses...' : activeTab === 'login' ? 'Masuk Panel, Bro!' : 'Daftarkan Akun Baru'}
        </button>

        {/* Elegant divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          margin: '4px 0',
          color: 'var(--text-muted)',
          fontSize: '0.75rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
          <span style={{ padding: '0 10px' }}>atau login lewat</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
        </div>

        {/* Interactive Google Sign-In Button */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-glass)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.borderColor = 'var(--border-glass)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.59.1-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.579c1.32 0 2.507.454 3.44 1.345l2.582-2.58C13.463.894 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.579 9 3.579z" fill="#EA4335"/>
          </svg>
          Masuk dengan Google
        </button>
      </form>

      {/* Google Mockup Interactive Modal */}
      {showGoogleModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '380px',
            padding: '28px',
            border: '1px solid var(--border-glass-glow)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.59.1-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.579c1.32 0 2.507.454 3.44 1.345l2.582-2.58C13.463.894 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.579 9 3.579z" fill="#EA4335"/>
                </svg>
                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Simulasi Google Auth</span>
              </div>
              <button 
                onClick={() => setShowGoogleModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Pilih salah satu akun Google simulasi di bawah untuk menguji alur Login Google, atau ketik email kustom lu secara manual.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mockGoogleAccounts.map((acc, i) => (
                <div 
                  key={i}
                  onClick={() => handleGoogleMockLogin(acc.email, acc.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}>
                    {acc.name.charAt(0)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{acc.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.email}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              margin: '4px 0',
              color: 'var(--text-muted)',
              fontSize: '0.7rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
              <span style={{ padding: '0 8px' }}>atau ketik kustom</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="ketik.email.google@gmail.com"
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
              <input
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                placeholder="Nama Lengkap Lu (Opsional)"
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => handleGoogleMockLogin(googleEmail, googleName)}
                disabled={!googleEmail.includes('@')}
                className="btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              >
                Gunakan Akun Kustom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

