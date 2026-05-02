/* ═══════════════════════════════════════════════════════════════
   HisabX — App Entry Point
   ═══════════════════════════════════════════════════════════════ */

import 'material-symbols/outlined.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/layout.css';

import { App as CapacitorApp } from '@capacitor/app';
import { route, startRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { store } from './store.js';

import homeScreen from './screens/home.js';
import groupDetailScreen from './screens/group-detail.js';
import addExpenseScreen from './screens/add-expense.js';
import balancesScreen from './screens/balances.js';
import activityScreen from './screens/activity.js';
import profileScreen from './screens/profile.js';
import createGroupScreen from './screens/create-group.js';
import loginScreen from './screens/login.js';
import balanceDetailScreen from './screens/balance-detail.js';
import upiSetupScreen from './screens/upi-setup.js';

// Register routes
route('/', homeScreen);
route('/group/:id', groupDetailScreen);
route('/add-expense', addExpenseScreen);
route('/add-expense/:groupId', addExpenseScreen);
route('/balances', balancesScreen);
route('/activity', activityScreen);
route('/profile', profileScreen);
route('/create-group', createGroupScreen);
route('/balance-detail/:memberId/:direction', balanceDetailScreen);

// Handle hardware back button
CapacitorApp.addListener('backButton', () => {
  const hash = window.location.hash;
  if (hash && hash !== '#/') {
    window.history.back();
  } else {
    CapacitorApp.exitApp();
  }
});

async function bootApp() {
  const app = document.getElementById('app');

  // Check for existing session
  const hasSession = await store.init();

  if (!hasSession) {
    // Show login screen
    app.innerHTML = '';
    const loginContainer = document.createElement('div');
    loginContainer.className = 'page-container';
    app.appendChild(loginContainer);
    loginScreen(loginContainer, {}, () => {
      // On successful login, reload the app
      window.location.reload();
    });
    return;
  }

  // Check if UPI ID is missing
  if (!store.user.upiId) {
    app.innerHTML = '';
    const setupContainer = document.createElement('div');
    setupContainer.className = 'page-container';
    app.appendChild(setupContainer);
    upiSetupScreen(setupContainer, {}, () => {
      window.location.reload();
    });
    return;
  }

  // User is logged in and has UPI ID — mount the app
  const pageContainer = document.createElement('div');
  pageContainer.className = 'page-container';
  app.appendChild(pageContainer);
  renderNavbar(app);

  // Start routing
  startRouter();

  // Listen for realtime updates and re-render current route
  store.subscribe(() => {
    // The router will handle re-rendering when navigated
    // Only dispatch a global reload if we are not on an editing screen
    const hash = window.location.hash || '#/';
    if (hash.includes('/add-expense') || hash.includes('/create-group') || hash.includes('/profile') || hash.includes('/balance-detail')) {
      return; // The screen manages its own local state during edits
    }
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

bootApp();
