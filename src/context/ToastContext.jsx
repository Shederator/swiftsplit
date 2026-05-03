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
    setToasts(prev => [...prev, { id, message, type }]);
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
  success: { bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.2)', color: '#00d68f' },
  error:   { bg: 'rgba(255, 107, 107, 0.12)', border: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' },
  info:    { bg: 'rgba(108, 92, 231, 0.12)', border: 'rgba(108, 92, 231, 0.2)', color: '#6c5ce7' }
};

const icons = { success: 'check_circle', error: 'error', info: 'info' };

function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 420, width: '90%', pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info;
        return (
          <div key={t.id} className={t.exiting ? 'toast-exit' : 'toast-enter'} style={{
            background: c.bg, color: c.color, padding: '12px 18px',
            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
            fontWeight: 500, fontSize: 13, border: `1px solid ${c.border}`,
            backdropFilter: 'blur(16px)', pointerEvents: 'auto'
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18, fontVariationSettings: "'FILL' 1"
            }}>{icons[t.type] || 'info'}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
