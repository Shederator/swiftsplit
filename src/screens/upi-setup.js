/* ═══════════════════════════════════════════════════════════════
   HisabX — UPI Setup Screen
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { showToast } from '../components/toast.js';

export default function upiSetupScreen(container, params, onSetupSuccess) {
  function render() {
    container.innerHTML = `
      <div class="login-screen">
        <div class="login-glow"></div>
        <div class="login-content">
          <div class="login-logo">
            <div class="logo-icon-lg" style="background: linear-gradient(135deg, #00d68f 0%, #00b87a 100%); box-shadow: 0 8px 32px rgba(0, 214, 143, 0.3);">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;color:white;font-size:32px">account_balance_wallet</span>
            </div>
            <h1 class="login-title">Add UPI ID</h1>
            <p class="login-subtitle">We need this so friends can pay you back.</p>
          </div>

          <div class="login-card">
            <div class="login-form">
              <div class="input-wrapper">
                <span class="material-symbols-outlined">alternate_email</span>
                <input type="text" id="upi-input" class="input-field" placeholder="e.g. username@bank" autocomplete="off">
              </div>
              <button class="btn btn-primary ripple login-btn" id="btn-save-upi" style="background: var(--gradient-accent)">
                <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const btn = container.querySelector('#btn-save-upi');
    const input = container.querySelector('#upi-input');

    if (btn) btn.addEventListener('click', handleSave);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSave();
      });
      // Focus after a short delay for animation
      setTimeout(() => input.focus(), 300);
    }
  }

  async function handleSave() {
    const upiId = container.querySelector('#upi-input')?.value.trim();
    if (!upiId) {
      showToast('Please enter your UPI ID', 'error');
      return;
    }

    if (!upiId.includes('@')) {
      showToast('Invalid UPI ID format (missing @)', 'error');
      return;
    }

    const btn = container.querySelector('#btn-save-upi');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:18px">progress_activity</span> Saving...';

    try {
      await store.updateUpiId(upiId);
      showToast('UPI ID saved!', 'success');
      setTimeout(() => onSetupSuccess(), 500);
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">check_circle</span> Continue';
    }
  }

  render();
}
