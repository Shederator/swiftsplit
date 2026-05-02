/* HisabX — Profile Screen (Dark Theme) */

import { store } from '../store.js';
import { renderHomeHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import {
  mountAnimatedAvatar, avatarPalettes, avatarIcons,
  getDefaultPaletteIdx
} from '../components/animated-avatar.js';

function showPromptModal(title, initialValue, onSave, onCancel) {
  const existingOverlay = document.getElementById('prompt-modal-overlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'prompt-modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border-light);border-radius:24px;padding:24px;width:100%;max-width:320px;display:flex;flex-direction:column;gap:16px;box-shadow:0 10px 30px rgba(0,0,0,0.3);';
  
  modal.innerHTML = `
    <h3 style="margin:0;font-size:18px;">${title}</h3>
    <input type="text" id="prompt-input" value="${initialValue || ''}" placeholder="Enter UPI ID" style="width:100%;background:var(--bg-body);border:1px solid var(--border);border-radius:12px;padding:12px 16px;color:var(--text-primary);font-size:15px;outline:none;" />
    <div style="display:flex;gap:12px;margin-top:8px;">
      <button id="prompt-cancel" style="flex:1;padding:12px;border-radius:12px;border:1px solid var(--border-light);background:transparent;color:var(--text-primary);font-weight:600;cursor:pointer;">Cancel</button>
      <button id="prompt-save" style="flex:1;padding:12px;border-radius:12px;border:none;background:var(--accent);color:#fff;font-weight:600;cursor:pointer;">Save</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  const input = modal.querySelector('#prompt-input');
  input.focus();
  
  modal.querySelector('#prompt-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  });
  
  modal.querySelector('#prompt-save').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onSave) onSave(input.value);
  });
}

export default function profileScreen(container) {
  const user = store.user;
  const member = store.getMember(user.id);
  const pref = member?.avatarPref || { type: 'animated', paletteIdx: getDefaultPaletteIdx(user.name), image: null };
  let stopAnim = null;

  container.innerHTML = `
    ${renderHomeHeader()}
    <div class="page-content stagger">
      <!-- Profile Card -->
      <section style="text-align:center;padding:var(--section-gap) 0">
        <div style="display:inline-block;position:relative">
          <!-- Glow ring -->
          <div id="avatar-glow" class="avatar-glow-ring"></div>
          <!-- Avatar mount -->
          <div id="avatar-mount" class="avatar-mount"></div>
          <!-- Edit button -->
          <div id="edit-avatar-btn" class="avatar-edit-btn">
            <span class="material-symbols-outlined" style="font-size:14px">edit</span>
          </div>
        </div>
        <h2 style="font-size:24px;font-weight:700;color:var(--text-primary);margin-top:var(--stack-gap)">${user.name}</h2>
        <p style="font-size:14px;color:var(--text-tertiary)">Member since April 2026</p>
      </section>

      <!-- Stats -->
      <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gutter);margin-bottom:var(--section-gap)">
        <div class="card" style="text-align:center;padding:16px 12px">
          <span style="font-size:24px;font-weight:700;color:var(--accent)">${store.groups.length}</span>
          <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);display:block;margin-top:4px">Groups</span>
        </div>
        <div class="card" style="text-align:center;padding:16px 12px">
          <span style="font-size:24px;font-weight:700;color:var(--accent)">${store.expenses.length}</span>
          <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);display:block;margin-top:4px">Expenses</span>
        </div>
        <div class="card" style="text-align:center;padding:16px 12px">
          <span style="font-size:24px;font-weight:700;color:var(--accent)">${store.settlements.length}</span>
          <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);display:block;margin-top:4px">Settled</span>
        </div>
      </section>

      <!-- Menu Items -->
      <section>
        <div class="card" style="padding:0;overflow:hidden">
          ${[
            { id: 'edit-upi', icon: 'account_balance', label: 'UPI ID', value: member?.upiId || 'Not set' },
            { icon: 'currency_rupee', label: 'Currency', value: 'INR (₹)' },
            { icon: 'notifications', label: 'Notifications', value: 'On' },
            { icon: 'palette', label: 'Theme', value: 'Dark Crypto' },
            { icon: 'info', label: 'About HisabX', value: 'v1.0.0' }
          ].map((item, i, arr) => `
            <div ${item.id ? `id="${item.id}"` : ''} style="display:flex;align-items:center;gap:16px;padding:16px;${i < arr.length - 1 ? 'border-bottom:1px solid var(--border)' : ''};transition:background var(--duration-fast);cursor:pointer" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='transparent'">
              <span class="material-symbols-outlined" style="color:var(--text-secondary)">${item.icon}</span>
              <span style="font-size:15px;font-weight:500;color:var(--text-primary);flex:1">${item.label}</span>
              <span style="font-size:13px;color:var(--text-tertiary)">${item.value}</span>
              <span class="material-symbols-outlined" style="font-size:20px;color:var(--text-disabled)">chevron_right</span>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Reset -->
      <section style="margin-top:var(--section-gap);display:flex;flex-direction:column;gap:12px">
        <button class="btn btn-outline" style="width:100%;color:var(--red);border-color:rgba(255,107,107,0.3)" id="reset-btn">
          <span class="material-symbols-outlined" style="font-size:18px">restart_alt</span>
          Reset All Data
        </button>
        <button class="btn btn-outline" style="width:100%;color:var(--text-secondary);border-color:var(--border)" id="logout-btn">
          <span class="material-symbols-outlined" style="font-size:18px">logout</span>
          Logout
        </button>
      </section>
      
      <div style="height:100px"></div>
    </div>

    <!-- Avatar Editor Bottom Sheet -->
    <div class="overlay" id="avatar-overlay"></div>
    <div class="bottom-sheet" id="avatar-sheet">
      <div class="sheet-handle"></div>
      <h3 style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:20px;text-align:center">Choose Avatar Style</h3>

      <p style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:12px">Animated Gradients</p>
      <div id="palette-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">
        ${avatarPalettes.map((p, i) => `
          <div class="palette-opt${pref.type === 'animated' && pref.paletteIdx === i ? ' active' : ''}" data-idx="${i}">
            <div class="palette-swatch" style="background:linear-gradient(135deg,${p[0]},${p[1]},${p[2]});display:flex;align-items:center;justify-content:center">
              <span class="material-symbols-outlined" style="color:rgba(255,255,255,0.9);font-size:24px">${avatarIcons[i]}</span>
            </div>
            ${pref.type === 'animated' && pref.paletteIdx === i ? '<div class="palette-check-wrap" style="position:absolute;top:-4px;right:-4px;background:var(--accent);border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.4)"><span class="material-symbols-outlined palette-check" style="font-size:14px;color:white;position:static;transform:none">check</span></div>' : ''}
          </div>
        `).join('')}
      </div>

      <div style="height:1px;background:var(--border);margin-bottom:20px"></div>

      <p style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:12px">Custom Photo</p>
      <button class="btn btn-outline" style="width:100%;gap:8px" id="upload-photo-btn">
        <span class="material-symbols-outlined" style="font-size:18px">add_a_photo</span>
        Upload Photo
      </button>
      <input type="file" id="avatar-file-input" accept="image/*" style="display:none">
      
      <div id="remove-photo-wrap" style="margin-top:12px;text-align:center;display:${pref.type === 'custom' ? 'block' : 'none'}">
        <button class="btn btn-outline" style="color:var(--red);border-color:rgba(255,107,107,0.3);gap:6px;width:100%" id="remove-photo-btn">
          <span class="material-symbols-outlined" style="font-size:16px">delete</span>
          Remove Photo
        </button>
      </div>
    </div>`;

  // ─── Mount the avatar ───
  const mount = container.querySelector('#avatar-mount');
  const glowEl = container.querySelector('#avatar-glow');

  function renderCurrentAvatar() {
    if (stopAnim) stopAnim();
    if (pref.type === 'custom' && pref.image) {
      mount.innerHTML = `<img src="${pref.image}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block">`;
      const palette = avatarPalettes[pref.paletteIdx || 0];
      glowEl.style.background = `linear-gradient(135deg,${palette[0]},${palette[1]},${palette[2]})`;
    } else {
      const palette = avatarPalettes[pref.paletteIdx];
      glowEl.style.background = `linear-gradient(135deg,${palette[0]},${palette[1]},${palette[2]})`;
      stopAnim = mountAnimatedAvatar(mount, user.name, pref.paletteIdx, 96);
    }
  }
  renderCurrentAvatar();

  // ─── Bottom sheet open/close ───
  const overlay = container.querySelector('#avatar-overlay');
  const sheet = container.querySelector('#avatar-sheet');

  function openSheet() { overlay.classList.add('active'); sheet.classList.add('active'); }
  function closeSheet() { overlay.classList.remove('active'); sheet.classList.remove('active'); }

  container.querySelector('#edit-avatar-btn').addEventListener('click', openSheet);
  overlay.addEventListener('click', closeSheet);

  // ─── Palette selection ───
  container.querySelector('#palette-grid').addEventListener('click', async (e) => {
    const opt = e.target.closest('.palette-opt');
    if (!opt) return;
    const idx = parseInt(opt.dataset.idx);
    pref.type = 'animated';
    pref.paletteIdx = idx;
    pref.image = null;
    
    // UI optimistic update
    renderCurrentAvatar();
    updatePaletteUI();
    container.querySelector('#remove-photo-wrap').style.display = 'none';
    
    try {
      await store.updateUserAvatar(pref);
      showToast('Avatar updated!', 'success');
    } catch (err) {
      showToast('Failed to save avatar', 'error');
    }
  });

  function updatePaletteUI() {
    container.querySelectorAll('.palette-opt').forEach(el => {
      const idx = parseInt(el.dataset.idx);
      const isActive = pref.type === 'animated' && pref.paletteIdx === idx;
      el.classList.toggle('active', isActive);
      const swatch = el.querySelector('.palette-swatch');
      // Update check mark
      const existing = el.querySelector('.palette-check-wrap');
      if (isActive && !existing) {
        const wrap = document.createElement('div');
        wrap.className = 'palette-check-wrap';
        wrap.style = 'position:absolute;top:-4px;right:-4px;background:var(--accent);border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.4)';
        wrap.innerHTML = '<span class="material-symbols-outlined palette-check" style="font-size:14px;color:white;position:static;transform:none">check</span>';
        el.appendChild(wrap);
      } else if (!isActive && existing) {
        existing.remove();
      }
    });
  }

  // ─── Upload photo ───
  const fileInput = container.querySelector('#avatar-file-input');
  container.querySelector('#upload-photo-btn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    
    const uploadBtn = container.querySelector('#upload-photo-btn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:18px">progress_activity</span> Uploading...';
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Resize to 256x256
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const cx = c.getContext('2d');
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2;
        const sy = (img.height - s) / 2;
        cx.drawImage(img, sx, sy, s, s, 0, 0, 256, 256);
        
        c.toBlob(async (blob) => {
          try {
            const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
            
            let url;
            try {
              url = await store.uploadAvatarImage(resizedFile);
            } catch (storageErr) {
              throw new Error('Storage Error: ' + storageErr.message);
            }
            
            pref.type = 'custom';
            pref.image = url;
            
            try {
              await store.updateUserAvatar(pref);
            } catch (dbErr) {
              throw new Error('Database Error: ' + dbErr.message);
            }
            
            renderCurrentAvatar();
            updatePaletteUI();
            container.querySelector('#remove-photo-wrap').style.display = 'block';
            showToast('Photo uploaded!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
          }
        }, 'image/jpeg', 0.85);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ─── Remove photo ───
  const removeBtn = container.querySelector('#remove-photo-btn');
  if (removeBtn) removeBtn.addEventListener('click', async () => {
    pref.type = 'animated';
    pref.image = null;
    renderCurrentAvatar();
    updatePaletteUI();
    container.querySelector('#remove-photo-wrap').style.display = 'none';
    try {
      await store.updateUserAvatar(pref);
      showToast('Photo removed', 'success');
    } catch (err) {
      showToast('Failed to remove photo', 'error');
    }
  });

  // ─── Edit UPI ID ───
  const editUpiBtn = container.querySelector('#edit-upi');
  if (editUpiBtn) {
    editUpiBtn.addEventListener('click', () => {
      showPromptModal('Edit UPI ID', member?.upiId || '', async (newValue) => {
        const newUpi = newValue.trim();
        if (newUpi !== (member?.upiId || '')) {
          try {
            await store.updateUpiId(newUpi);
            showToast('UPI ID updated!', 'success');
            profileScreen(container);
          } catch (err) {
            showToast('Failed to update UPI ID', 'error');
          }
        }
      });
    });
  }

  // ─── Reset / Logout ───
  const resetBtn = container.querySelector('#reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', async () => {
    await store.resetData();
    showToast('Data reset!', 'success');
    profileScreen(container);
  });

  const logoutBtn = container.querySelector('#logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    store.logout();
    window.location.reload();
  });
}
