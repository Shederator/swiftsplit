/* HisabX — Header Component (Dark Theme) */

import { navigate } from '../router.js';

export function renderHomeHeader() {
  return `<header class="app-header">
    <div class="header-inner">
      <div class="header-left">
        <div class="header-logo">
          <div class="logo-icon"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;color:white;font-size:17px">payments</span></div>
          <h1 class="logo-text">HisabX</h1>
        </div>
      </div>
      <button class="btn-icon" id="header-notifications" aria-label="Notifications">
        <span class="material-symbols-outlined" style="font-size:20px">notifications</span>
      </button>
    </div>
  </header>`;
}

export function renderDetailHeader(title, subtitle = '') {
  return `<header class="app-header">
    <div class="header-inner">
      <div class="header-left">
        <button class="btn-icon header-back" aria-label="Go back">
          <span class="material-symbols-outlined" style="font-size:20px">arrow_back</span>
        </button>
        <div>
          <h1 class="header-title">${title}</h1>
          ${subtitle ? `<span style="font-size:12px;color:var(--text-secondary);font-weight:500">${subtitle}</span>` : ''}
        </div>
      </div>
      <div class="header-right" id="header-actions"></div>
    </div>
  </header>`;
}

export function bindBackButton(container) {
  const btn = container.querySelector('.header-back');
  if (btn) btn.addEventListener('click', () => window.history.back());
}
