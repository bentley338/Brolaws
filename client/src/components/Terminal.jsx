import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../utils/api';

export default function Terminal() {
  const [input, setInput] = useState('');
  const [lines, setLines] = useState([
    { text: 'Microsoft Windows [Version 10.0.22631]', type: 'system' },
    { text: '(c) Microsoft Corporation. All rights reserved.', type: 'system' },
    { text: '', type: 'system' },
    { text: 'OpenClaw Interactive Web Terminal V1.0', type: 'header' },
    { text: 'Ketik perintah shell apa saja untuk dieksekusi langsung di server.', type: 'header' },
    { text: 'Contoh: "dir" atau ketik "notepad" untuk membuka aplikasi.', type: 'header' },
    { text: '', type: 'system' }
  ]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  const scrollToBottom = () => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const focusInput = () => {
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      
      const newIndex = historyIndex + 1;
      if (newIndex < cmdHistory.length) {
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const executeCommand = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Log the input
    const currentDirectory = 'C:\\Users\\admin\\project\\alexapi';
    setLines(prev => [...prev, { text: `${currentDirectory}> ${trimmedInput}`, type: 'input' }]);
    
    // Add to history
    const updatedHistory = [...cmdHistory, trimmedInput];
    setCmdHistory(updatedHistory);
    setHistoryIndex(-1);
    setInput('');
    setLoading(true);

    try {
      const response = await apiRequest('/api/terminal/run', 'POST', { command: trimmedInput });
      
      // Split output by newlines and add to lines
      const outputLines = response.output.split('\n');
      const formattedOutput = outputLines.map(line => ({
        text: line,
        type: response.error ? 'error' : 'output'
      }));

      setLines(prev => [...prev, ...formattedOutput]);
    } catch (e) {
      setLines(prev => [...prev, { text: `System Error: ${e.message}`, type: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearConsole = () => {
    setLines([
      { text: 'Console cleared. OpenClaw Hub active.', type: 'system' }
    ]);
  };

  return (
    <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="text-gradient-cyan" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>Web Terminal Console</h1>
        <p style={{ color: 'var(--text-muted)' }}>Direct, high-privilege access shell to your Windows server environment.</p>
      </div>

      {/* Terminal Window Container */}
      <div 
        onClick={focusInput}
        className="glass-panel" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          background: 'rgba(5, 7, 12, 0.9)',
          border: '1px solid var(--border-glass-glow)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          cursor: 'text'
        }}
      >
        {/* Terminal Header Bar */}
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          borderBottom: '1px solid var(--border-glass)', 
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Mac-like Window Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>powershell.exe - alexapi</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              clearConsole();
            }}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
          >
            Clear Screen
          </button>
        </div>

        {/* Terminal Screen area */}
        <div style={{ 
          flex: 1, 
          padding: '24px', 
          overflowY: 'auto', 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.9rem', 
          lineHeight: '1.7',
          color: '#e5e7eb'
        }}>
          {lines.map((line, idx) => {
            let color = '#d1d5db';
            let weight = 'normal';
            if (line.type === 'input') {
              color = '#6366f1';
              weight = 'bold';
            } else if (line.type === 'error') {
              color = 'var(--status-offline)';
            } else if (line.type === 'header') {
              color = 'var(--accent-cyan)';
            } else if (line.type === 'system') {
              color = 'var(--text-dark)';
            }
            return (
              <div key={idx} style={{ color, fontWeight: weight, whiteSpace: 'pre-wrap' }}>
                {line.text}
              </div>
            );
          })}
          {loading && (
            <div style={{ color: 'var(--accent-purple)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot online" style={{ animationDuration: '0.7s', width: '6px', height: '6px' }}></span>
              Running automated process...
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Input line */}
        <div style={{ 
          background: 'rgba(0,0,0,0.4)', 
          borderTop: '1px solid var(--border-glass)', 
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{ color: 'var(--accent-indigo)', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            C:\Users\admin\project\alexapi&gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              boxShadow: 'none',
              padding: '0', 
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              flex: 1
            }}
            placeholder={loading ? "Executing task..." : "Ketik perintah shell di sini..."}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
