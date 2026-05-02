/* HisabX — Bottom Navigation Bar (Dark Theme) */

import { navigate } from '../router.js';

const tabs = [
  { id: 'groups', icon: 'space_dashboard', label: 'Groups', route: '/' },
  { id: 'activity', icon: 'history', label: 'Activity', route: '/activity' },
  { id: 'add', icon: 'add', label: 'Add', route: '/add-expense' },
  { id: 'balances', icon: 'account_balance_wallet', label: 'Balances', route: '/balances' },
  { id: 'profile', icon: 'person', label: 'Profile', route: '/profile' }
];

export function renderNavbar(container) {
  const nav = document.createElement('nav');
  nav.id = 'bottom-nav';
  nav.className = 'bottom-nav';

  nav.innerHTML = `<div class="nav-inner">${tabs.map(tab => {
    if (tab.id === 'add') {
      return `<button class="nav-tab nav-fab-btn" data-route="${tab.route}" aria-label="${tab.label}">
        <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL' 1">${tab.icon}</span>
      </button>`;
    }
    return `<button class="nav-tab" data-tab="${tab.id}" data-route="${tab.route}" aria-label="${tab.label}">
      <span class="material-symbols-outlined nav-icon">${tab.icon}</span>
      <span class="nav-label">${tab.label}</span>
    </button>`;
  }).join('')}</div>`;

  container.appendChild(nav);

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-route]');
    if (btn) navigate(btn.dataset.route);
  });

  updateActiveTab();
  window.addEventListener('hashchange', updateActiveTab);
}

function updateActiveTab() {
  const hash = window.location.hash.slice(1) || '/';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  nav.querySelectorAll('.nav-tab').forEach(btn => {
    const route = btn.dataset.route;
    const isActive = (route === '/' && (hash === '/' || hash === '')) || (route !== '/' && hash.startsWith(route));
    btn.classList.toggle('active', isActive);
    const icon = btn.querySelector('.nav-icon');
    if (icon) icon.style.fontVariationSettings = isActive ? "'FILL' 1" : "'FILL' 0";
  });

  // Hide navbar on certain screens
  const hideOn = ['/add-expense', '/create-group'];
  const shouldHide = hideOn.some(r => hash.startsWith(r)) || hash.startsWith('/group/');
  nav.style.transform = shouldHide ? 'translateX(-50%) translateY(120%)' : 'translateX(-50%) translateY(0)';
}
