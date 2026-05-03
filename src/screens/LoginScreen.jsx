/* ═══════════════════════════════════════════════════════════════
   HisabX — Login Screen (React)
   ═══════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { useToast } from '../context/ToastContext.jsx';
import { generateId } from '../utils.js';

export default function LoginScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  async function handleLogin() {
    if (!loginUsername || !loginPassword) {
      showToast('Please enter username and password', 'error');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('users').select('*')
      .eq('username', loginUsername)
      .eq('password', loginPassword)
      .single();

    if (error || !data) {
      showToast('Invalid username or password', 'error');
      setLoading(false);
      return;
    }

    localStorage.setItem('hisabx_session', JSON.stringify({
      id: data.id, name: data.name, username: data.username, upiId: data.upi_id || null
    }));

    showToast(`Welcome back, ${data.name}!`, 'success');
    setTimeout(() => onLoginSuccess(), 500);
  }

  async function handleRegister() {
    if (!regName || !regUsername || !regPassword) {
      showToast('Please fill all fields', 'error'); return;
    }
    if (regUsername.length < 3) {
      showToast('Username must be at least 3 characters', 'error'); return;
    }
    if (regPassword.length < 4) {
      showToast('Password must be at least 4 characters', 'error'); return;
    }
    setLoading(true);

    const { data: existing } = await supabase
      .from('users').select('id').eq('username', regUsername).single();

    if (existing) {
      showToast('Username already taken', 'error');
      setLoading(false); return;
    }

    const userId = generateId();
    const { error: userErr } = await supabase
      .from('users').insert({ id: userId, username: regUsername, password: regPassword, name: regName });

    if (userErr) {
      showToast('Registration failed: ' + userErr.message, 'error');
      setLoading(false); return;
    }

    await supabase.from('members').insert({ id: userId, name: regName });

    localStorage.setItem('hisabx_session', JSON.stringify({
      id: userId, name: regName, username: regUsername
    }));

    showToast(`Welcome, ${regName}! Account created.`, 'success');
    setTimeout(() => onLoginSuccess(), 500);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (isRegister) handleRegister();
      else handleLogin();
    }
  }

  return (
    <div className="login-screen">
      <div className="login-glow"></div>
      <div className="login-content">
        <div className="login-logo">
          <div className="logo-icon-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'white', fontSize: 32 }}>payments</span>
          </div>
          <h1 className="login-title">HisabX</h1>
          <p className="login-subtitle">Split expenses. Track balances. Settle up.</p>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button className={`login-tab ${!isRegister ? 'active' : ''}`} onClick={() => setIsRegister(false)}>Login</button>
            <button className={`login-tab ${isRegister ? 'active' : ''}`} onClick={() => setIsRegister(true)}>Register</button>
          </div>

          {isRegister ? (
            <div className="login-form">
              <div className="input-wrapper">
                <span className="material-symbols-outlined">person</span>
                <input type="text" className="input-field" placeholder="Display Name"
                  autoComplete="name" value={regName} onChange={e => setRegName(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <div className="input-wrapper">
                <span className="material-symbols-outlined">account_circle</span>
                <input type="text" className="input-field" placeholder="Username"
                  autoComplete="username" value={regUsername} onChange={e => setRegUsername(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <div className="input-wrapper">
                <span className="material-symbols-outlined">lock</span>
                <input type="password" className="input-field" placeholder="Password"
                  autoComplete="new-password" value={regPassword} onChange={e => setRegPassword(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <button className="btn btn-primary ripple login-btn" onClick={handleRegister} disabled={loading}>
                {loading ? (
                  <><span className="material-symbols-outlined spin" style={{ fontSize: 18 }}>progress_activity</span> Creating...</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Create Account</>
                )}
              </button>
            </div>
          ) : (
            <div className="login-form">
              <div className="input-wrapper">
                <span className="material-symbols-outlined">account_circle</span>
                <input type="text" className="input-field" placeholder="Username"
                  autoComplete="username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <div className="input-wrapper">
                <span className="material-symbols-outlined">lock</span>
                <input type="password" className="input-field" placeholder="Password"
                  autoComplete="current-password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <button className="btn btn-primary ripple login-btn" onClick={handleLogin} disabled={loading}>
                {loading ? (
                  <><span className="material-symbols-outlined spin" style={{ fontSize: 18 }}>progress_activity</span> Signing in...</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span> Sign In</>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="login-footer">Built with ❤️ for smart splitting</p>
      </div>
    </div>
  );
}
