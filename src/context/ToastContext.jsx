/* ═══════════════════════════════════════════════════════════════
   HisabX — Toast Context (React-native toast system)
   ═══════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let globalShowToast = null;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++idRef.current;
    setToasts(prev => {
      const updated = [...prev, { id, message, type }];
      if (updated.length > 3) return updated.slice(updated.length - 3);
      return updated;
    });
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  globalShowToast = showToast;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

/** Imperative showToast for non-React code (store callbacks etc) */
export function showToastGlobal(message, type = 'success', duration = 3000) {
  if (globalShowToast) {
    globalShowToast(message, type, duration);
  }
}

/* ── Toast UI ──────────────────────────────────────────────── */

const colors = {
  success: '#00d68f',
  error:   '#ff6b6b',
  info:    '#6c5ce7'
};

const icons = { success: 'check_circle', error: 'error', info: 'info' };

function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: 'fixed', top: 40, left: 0, right: 0,
      zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const iconColor = colors[t.type] || colors.info;
        return (
          <div key={t.id} className={t.exiting ? 'toast-exit' : 'toast-enter'} style={{
            background: 'rgba(24, 24, 28, 0.85)', color: '#fff', padding: '12px 18px',
            borderRadius: 100, display: 'flex', alignItems: 'center', gap: 10,
            fontWeight: 500, fontSize: 13, border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)', pointerEvents: 'auto',
            maxWidth: '90%', width: 'max-content'
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18, color: iconColor, fontVariationSettings: "'FILL' 1"
            }}>{icons[t.type] || 'info'}</span>
            <span style={{ paddingRight: 4 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
