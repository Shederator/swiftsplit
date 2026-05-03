/* ═══════════════════════════════════════════════════════════════
   HisabX — App Shell (React)
   Replaces router.js + main.js auth gate with React components.
   No more window.location.reload() or innerHTML wipes.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { store } from './store.js';
import { ToastProvider } from './context/ToastContext.jsx';
import { NavbarR } from './components/NavbarR.jsx';

// Screens
import LoginScreen from './screens/LoginScreen.jsx';
import UpiSetupScreen from './screens/UpiSetupScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import ActivityScreen from './screens/ActivityScreen.jsx';
import BalancesScreen from './screens/BalancesScreen.jsx';
import BalanceDetailScreen from './screens/BalanceDetailScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import GroupDetailScreen from './screens/GroupDetailScreen.jsx';
import AddExpenseScreen from './screens/AddExpenseScreen.jsx';
import CreateGroupScreen from './screens/CreateGroupScreen.jsx';
import HaggleScreen from './screens/HaggleScreen.jsx';

export default function App() {
  const [authState, setAuthState] = useState('loading'); // loading | login | upi | ready
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    const session = localStorage.getItem('hisabx_session');
    if (!session) { setAuthState('login'); return; }

    try {
      const user = JSON.parse(session);
      await store.init(user);

      // Check if UPI is set
      if (!user.upiId) {
        const fresh = store.getMember(user.id);
        if (!fresh?.upiId) { setAuthState('upi'); return; }
        // Update session with upiId
        localStorage.setItem('hisabx_session', JSON.stringify({ ...user, upiId: fresh.upiId }));
      }
      setAuthState('ready');
    } catch (e) {
      console.error('Boot error:', e);
      setInitError(e.message);
      setAuthState('login');
    }
  }

  function handleLoginSuccess() {
    // Re-boot after login — no page reload!
    setAuthState('loading');
    boot();
  }

  function handleUpiSuccess() {
    setAuthState('loading');
    boot();
  }

  function handleLogout() {
    setAuthState('login');
  }

  // Loading state
  if (authState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-body)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px' }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'white', fontSize: 24 }}>payments</span>
          </div>
          <span className="material-symbols-outlined spin" style={{ fontSize: 32, color: 'var(--accent)' }}>progress_activity</span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      {authState === 'login' && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {authState === 'upi' && (
        <UpiSetupScreen onSetupSuccess={handleUpiSuccess} />
      )}

      {authState === 'ready' && (
        <HashRouter>
          <div id="page-container" style={{ minHeight: '100vh' }}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/activity" element={<ActivityScreen />} />
              <Route path="/balances" element={<BalancesScreen />} />
              <Route path="/balance-detail/:memberId/:direction" element={<BalanceDetailScreen />} />
              <Route path="/profile" element={<ProfileScreen onLogout={handleLogout} />} />
              <Route path="/group/:id" element={<GroupDetailScreen />} />
              <Route path="/add-expense" element={<AddExpenseScreen />} />
              <Route path="/add-expense/:groupId" element={<AddExpenseScreen />} />
              <Route path="/create-group" element={<CreateGroupScreen />} />
              <Route path="/haggle/:memberId/:direction" element={<HaggleScreen />} />
            </Routes>
          </div>
          <NavbarR />
        </HashRouter>
      )}
    </ToastProvider>
  );
}
