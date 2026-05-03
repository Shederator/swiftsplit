/* ═══════════════════════════════════════════════════════════════
   HisabX — Bottom Navigation Bar (React)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { id: 'groups', icon: 'space_dashboard', label: 'Groups', route: '/' },
  { id: 'activity', icon: 'history', label: 'Activity', route: '/activity' },
  { id: 'add', icon: 'add', label: 'Add', route: '/add-expense' },
  { id: 'balances', icon: 'account_balance_wallet', label: 'Balances', route: '/balances' },
  { id: 'profile', icon: 'person', label: 'Profile', route: '/profile' }
];

export function NavbarR() {
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.pathname || '/';

  // Hide navbar on certain screens
  const hideOn = ['/add-expense', '/create-group'];
  const shouldHide = hideOn.some(r => hash.startsWith(r)) || hash.startsWith('/group/');

  return (
    <nav id="bottom-nav" className="bottom-nav" style={{
      transform: shouldHide ? 'translateX(-50%) translateY(120%)' : 'translateX(-50%) translateY(0)'
    }}>
      <div className="nav-inner">
        {tabs.map(tab => {
          if (tab.id === 'add') {
            return (
              <button key={tab.id} className="nav-tab nav-fab-btn"
                onClick={() => navigate(tab.route)} aria-label={tab.label}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 22, fontVariationSettings: "'FILL' 1"
                }}>{tab.icon}</span>
              </button>
            );
          }
          const isActive = (tab.route === '/' && (hash === '/' || hash === ''))
            || (tab.route !== '/' && hash.startsWith(tab.route));
          return (
            <button key={tab.id} className={`nav-tab ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.route)} aria-label={tab.label}>
              <span className="material-symbols-outlined nav-icon" style={{
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"
              }}>{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
