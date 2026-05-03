/* ═══════════════════════════════════════════════════════════════
   HisabX — Header Components (React)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export function HomeHeader() {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'white', fontSize: 17 }}>payments</span>
            </div>
            <h1 className="logo-text">HisabX</h1>
          </div>
        </div>
        <button className="btn-icon" onClick={() => navigate('/activity')} aria-label="Notifications">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
        </button>
      </div>
    </header>
  );
}

export function DetailHeader({ title, subtitle = '', onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <button className="btn-icon header-back" onClick={handleBack} aria-label="Go back">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <h1 className="header-title">{title}</h1>
            {subtitle && <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{subtitle}</span>}
          </div>
        </div>
        <div className="header-right" id="header-actions"></div>
      </div>
    </header>
  );
}
