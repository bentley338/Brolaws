import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../utils/api';

export default function AgentChat() {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Yo, woy! Gw Brolaws AI Agent. 🤖 Gw siap bantu lu ngoperasin server, ngebuka program Windows, atau nulis file secara otomatis. Ketik perintah lu di bawah, bro!',
      thoughts: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeThoughts, setActiveThoughts] = useState([]);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickCommands = [
    'Buka notepad',
    'Buka chrome',
    'Tampilkan berkas di folder ini',
    'Tulis pesan selamat datang di info.txt'
  ];

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    // Add user message
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);
    setActiveThoughts(['Menganalisa pesan pengguna...', 'Menghubungi modul penalaran AI...']);

    // Construct history for LLM
    const history = messages.slice(1).map(msg => ({
      role: msg.role,
      text: msg.text
    }));

    try {
      const result = await apiRequest('/api/chat', 'POST', {
        message: text,
        history
      });

      if (result.thoughts && result.thoughts.length > 0) {
        setActiveThoughts(result.thoughts);
      }

      setMessages(prev => [...prev, {
        role: 'model',
        text: result.text,
        thoughts: result.thoughts || []
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: `Error: Gagal terhubung dengan agen AI. ${e.message}`,
        thoughts: ['Koneksi gagal.']
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px', display: 'flex', gap: '24px', height: '100vh', overflow: 'hidden' }}>
      
      {/* Left Chat Pane */}
      <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>Autonomous AI Chat</h1>
          <p style={{ color: 'var(--text-muted)' }}>Instruct your AI agent using natural language to orchestrate files and open apps.</p>
        </div>

        {/* Chat Window */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(13, 17, 26, 0.4)' }}>
          
          {/* Message Area */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  {/* AI Avatar */}
                  {!isUser && (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))',
                      display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '0.85rem', fontWeight: 'bold',
                      justifyContent: 'center', boxShadow: 'var(--glow-purple)', flexShrink: 0
                    }}>
                      BL
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div 
                    onClick={() => !isUser && msg.thoughts && msg.thoughts.length > 0 && setActiveThoughts(msg.thoughts)}
                    style={{
                      maxWidth: '75%',
                      padding: '12px 18px',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '2px 16px 16px 16px',
                      background: isUser ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'rgba(255, 255, 255, 0.04)',
                      border: isUser ? 'none' : '1px solid var(--border-glass)',
                      color: '#f3f4f6',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      boxShadow: isUser ? 'var(--glow-purple)' : 'none',
                      whiteSpace: 'pre-wrap',
                      cursor: !isUser && msg.thoughts && msg.thoughts.length > 0 ? 'pointer' : 'default'
                    }}
                  >
                    {msg.text}
                    
                    {/* Thought Badge Indicator */}
                    {!isUser && msg.thoughts && msg.thoughts.length > 0 && (
                      <span style={{
                        display: 'block',
                        marginTop: '8px',
                        fontSize: '0.7rem',
                        color: 'var(--accent-cyan)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        💡 Lihat Pemikiran Agen
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                  border: '1px solid var(--border-glass)'
                }}>
                  ...
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Brolaws lagi mikir, santuy...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div style={{ display: 'flex', gap: '10px', padding: '12px 24px', overflowX: 'auto', borderTop: '1px solid var(--border-glass)' }}>
            {quickCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(cmd)}
                disabled={loading}
                className="badge badge-cyan"
                style={{
                  background: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  outline: 'none'
                }}
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={loading ? "Brolaws otw ngeproses perintah lu..." : "Ketik perintah lu di sini, bro (contoh: 'buka notepad' atau 'setel lagu lathi')..."}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="btn-primary"
              style={{ width: '50px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>

        </div>
      </div>

      {/* Right AI Thought Drawer Panel */}
      <div style={{ flex: 0.7, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 className="text-gradient-cyan" style={{ fontSize: '1.35rem', fontWeight: '600' }}>Agent Thought Stream</h2>
          <p style={{ color: 'var(--text-dark)', fontSize: '0.8rem' }}>Inspect the AI decision tree, tool calls, and sandbox logs.</p>
        </div>

        <div className="glass-panel" style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          background: 'rgba(5, 7, 12, 0.8)',
          border: '1px solid var(--border-glass-glow)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          lineHeight: '1.6',
          color: 'var(--accent-cyan)'
        }}>
          {activeThoughts.length === 0 ? (
            <div style={{ color: 'var(--text-dark)', textAlign: 'center', padding: '40px', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>
              Pilih balon pesan bot di sebelah kiri untuk melihat rekaman pemikiran dan eksekusi alat (tool calls) di sini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', fontFamily: 'var(--font-sans)', fontWeight: 'bold' }}>
                <span className="status-dot online"></span>
                TRACE LOG ACTIVE
              </div>
              {activeThoughts.map((thought, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  padding: '12px',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  color: thought.toLowerCase().includes('failed') || thought.toLowerCase().includes('error') ? 'var(--status-offline)' : thought.toLowerCase().includes('tool') || thought.toLowerCase().includes('execute') ? '#e5e7eb' : 'var(--accent-cyan)'
                }}>
                  <div style={{ color: 'var(--text-dark)', fontSize: '0.7rem', marginBottom: '4px', textTransform: 'uppercase' }}>STEP #{idx + 1}</div>
                  {thought}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
