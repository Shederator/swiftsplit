/* ═══════════════════════════════════════════════════════════════
   HisabX — Login / Register Screen
   ═══════════════════════════════════════════════════════════════ */

import { supabase } from '../supabase.js';
import { showToast } from '../components/toast.js';
import { generateId } from '../utils.js';

export default function loginScreen(container, params, onLoginSuccess) {
  let isRegister = false;

  function render() {
    container.innerHTML = `
      <div class="login-screen">
        <div class="login-glow"></div>
        <div class="login-content">
          <div class="login-logo">
            <div class="logo-icon-lg">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;color:white;font-size:32px">payments</span>
            </div>
            <h1 class="login-title">HisabX</h1>
            <p class="login-subtitle">Split expenses. Track balances. Settle up.</p>
          </div>

          <div class="login-card">
            <div class="login-tabs">
              <button class="login-tab ${!isRegister ? 'active' : ''}" id="tab-login">Login</button>
              <button class="login-tab ${isRegister ? 'active' : ''}" id="tab-register">Register</button>
            </div>

            ${isRegister ? `
              <div class="login-form">
                <div class="input-wrapper">
                  <span class="material-symbols-outlined">person</span>
                  <input type="text" id="reg-name" class="input-field" placeholder="Display Name" autocomplete="name">
                </div>
                <div class="input-wrapper">
                  <span class="material-symbols-outlined">account_circle</span>
                  <input type="text" id="reg-username" class="input-field" placeholder="Username" autocomplete="username">
                </div>
                <div class="input-wrapper">
                  <span class="material-symbols-outlined">lock</span>
                  <input type="password" id="reg-password" class="input-field" placeholder="Password" autocomplete="new-password">
                </div>
                <button class="btn btn-primary ripple login-btn" id="btn-register">
                  <span class="material-symbols-outlined" style="font-size:18px">person_add</span>
                  Create Account
                </button>
              </div>
            ` : `
              <div class="login-form">
                <div class="input-wrapper">
                  <span class="material-symbols-outlined">account_circle</span>
                  <input type="text" id="login-username" class="input-field" placeholder="Username" autocomplete="username">
                </div>
                <div class="input-wrapper">
                  <span class="material-symbols-outlined">lock</span>
                  <input type="password" id="login-password" class="input-field" placeholder="Password" autocomplete="current-password">
                </div>
                <button class="btn btn-primary ripple login-btn" id="btn-login">
                  <span class="material-symbols-outlined" style="font-size:18px">login</span>
                  Sign In
                </button>
              </div>
            `}
          </div>

          <p class="login-footer">Built with ❤️ for smart splitting</p>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const tabLogin = container.querySelector('#tab-login');
    const tabRegister = container.querySelector('#tab-register');
    if (tabLogin) tabLogin.addEventListener('click', () => { isRegister = false; render(); });
    if (tabRegister) tabRegister.addEventListener('click', () => { isRegister = true; render(); });

    const loginBtn = container.querySelector('#btn-login');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);

    const registerBtn = container.querySelector('#btn-register');
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);

    // Enter key support
    container.querySelectorAll('.input-field').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (isRegister) handleRegister();
          else handleLogin();
        }
      });
    });
  }

  async function handleLogin() {
    const username = container.querySelector('#login-username')?.value.trim();
    const password = container.querySelector('#login-password')?.value;

    if (!username || !password) {
      showToast('Please enter username and password', 'error');
      return;
    }

    const btn = container.querySelector('#btn-login');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:18px">progress_activity</span> Signing in...';

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      showToast('Invalid username or password', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">login</span> Sign In';
      return;
    }

    // Save session
    localStorage.setItem('hisabx_session', JSON.stringify({
      id: data.id,
      name: data.name,
      username: data.username,
      upiId: data.upi_id || null
    }));

    showToast(`Welcome back, ${data.name}!`, 'success');
    setTimeout(() => onLoginSuccess(), 500);
  }

  async function handleRegister() {
    const name = container.querySelector('#reg-name')?.value.trim();
    const username = container.querySelector('#reg-username')?.value.trim();
    const password = container.querySelector('#reg-password')?.value;

    if (!name || !username || !password) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (username.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }

    if (password.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    const btn = container.querySelector('#btn-register');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:18px">progress_activity</span> Creating...';

    // Check if username exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      showToast('Username already taken', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">person_add</span> Create Account';
      return;
    }

    const userId = generateId();

    // Create user
    const { error: userErr } = await supabase
      .from('users')
      .insert({ id: userId, username, password, name });

    if (userErr) {
      showToast('Registration failed: ' + userErr.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">person_add</span> Create Account';
      return;
    }

    // Create matching member
    await supabase.from('members').insert({ id: userId, name });

    // Save session
    localStorage.setItem('hisabx_session', JSON.stringify({
      id: userId,
      name,
      username
    }));

    showToast(`Welcome, ${name}! Account created.`, 'success');
    setTimeout(() => onLoginSuccess(), 500);
  }

  render();
}
