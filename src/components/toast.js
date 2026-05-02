/* HisabX — Toast Notification (Dark Theme) */

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:var(--z-toast,500);display:flex;flex-direction:column;gap:8px;max-width:420px;width:90%;pointer-events:none;';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'success', duration = 3000) {
  const container = ensureContainer();
  const toast = document.createElement('div');
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  const colors = {
    success: { bg: 'rgba(0, 214, 143, 0.12)', border: 'rgba(0, 214, 143, 0.2)', color: '#00d68f' },
    error: { bg: 'rgba(255, 107, 107, 0.12)', border: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' },
    info: { bg: 'rgba(108, 92, 231, 0.12)', border: 'rgba(108, 92, 231, 0.2)', color: '#6c5ce7' }
  };
  const c = colors[type] || colors.info;

  toast.className = 'toast-enter';
  toast.style.cssText = `background:${c.bg};color:${c.color};padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;font-weight:500;font-size:13px;border:1px solid ${c.border};backdrop-filter:blur(16px);pointer-events:auto;`;
  toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1">${icon}</span>${message}`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.className = 'toast-exit';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
