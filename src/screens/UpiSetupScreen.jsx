/* ═══════════════════════════════════════════════════════════════
   HisabX — UPI Setup Screen (React)
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { store } from '../store.js';
import { useToast } from '../context/ToastContext.jsx';

export default function UpiSetupScreen({ onSetupSuccess }) {
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const showToast = useToast();
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  async function handleSave() {
    if (!upiId.trim()) {
      showToast('Please enter your UPI ID', 'error'); return;
    }
    if (!upiId.includes('@')) {
      showToast('Invalid UPI ID format (missing @)', 'error'); return;
    }
    setLoading(true);
    try {
      await store.updateUpiId(upiId.trim());
      showToast('UPI ID saved!', 'success');
      setTimeout(() => onSetupSuccess(), 500);
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-glow"></div>
      <div className="login-content">
        <div className="login-logo">
          <div className="logo-icon-lg" style={{ background: 'linear-gradient(135deg, #00d68f 0%, #00b87a 100%)', boxShadow: '0 8px 32px rgba(0, 214, 143, 0.3)' }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'white', fontSize: 32 }}>account_balance_wallet</span>
          </div>
          <h1 className="login-title">Add UPI ID</h1>
          <p className="login-subtitle">We need this so friends can pay you back.</p>
        </div>

        <div className="login-card">
          <div className="login-form">
            <div className="input-wrapper">
              <span className="material-symbols-outlined">alternate_email</span>
              <input ref={inputRef} type="text" className="input-field" placeholder="e.g. username@bank"
                autoComplete="off" value={upiId} onChange={e => setUpiId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
            <button className="btn btn-primary ripple login-btn" onClick={handleSave} disabled={loading}
              style={{ background: 'var(--gradient-accent)' }}>
              {loading ? (
                <><span className="material-symbols-outlined spin" style={{ fontSize: 18 }}>progress_activity</span> Saving...</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span> Continue</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
