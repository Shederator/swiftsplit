/* ═══════════════════════════════════════════════════════════════
   HisabX — Animated Canvas Avatar
   ═══════════════════════════════════════════════════════════════ */

import { getInitials } from '../utils.js';

export const avatarPalettes = [
  ['#6c5ce7', '#a855f7', '#c084fc'],
  ['#00d68f', '#06b6d4', '#22d3ee'],
  ['#f472b6', '#ec4899', '#a855f7'],
  ['#fb923c', '#f59e0b', '#fbbf24'],
  ['#4ea8de', '#6366f1', '#8b5cf6'],
  ['#ef4444', '#f97316', '#fb923c'],
  ['#10b981', '#059669', '#34d399'],
  ['#8b5cf6', '#d946ef', '#f472b6'],
  ['#0ea5e9', '#38bdf8', '#7dd3fc'],
  ['#f43f5e', '#fb7185', '#fda4af'],
];

export function getDefaultPaletteIdx(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % avatarPalettes.length;
}

export function renderStaticAnimatedAvatar(paletteIdx, sizeClass = '') {
  const p = avatarPalettes[paletteIdx] || avatarPalettes[0];
  const icon = avatarIcons[paletteIdx] || avatarIcons[0];
  return `<div class="avatar ${sizeClass}" style="background: linear-gradient(135deg, ${p[0]}, ${p[1]}, ${p[2]}); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
    <span class="material-symbols-outlined" style="color: rgba(255,255,255,0.9); font-size: 1.2em; text-shadow: 0 2px 4px rgba(0,0,0,0.2)">${icon}</span>
  </div>`;
}

export const avatarIcons = [
  'rocket_launch',
  'cruelty_free',
  'smart_toy',
  'pets',
  'diamond',
  'sports_esports',
  'bolt',
  'local_fire_department',
  'savings',
  'star'
];

export function getDefaultIconIdx(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % avatarIcons.length;
}

/**
 * Mounts an animated canvas avatar into a container element.
 * Returns a cleanup function to stop animation.
 */
export function mountAnimatedAvatar(container, name, paletteIdx, size = 96) {
  const palette = avatarPalettes[paletteIdx] || avatarPalettes[0];
  const iconName = avatarIcons[paletteIdx] || avatarIcons[0];
  const dpr = Math.min(window.devicePixelRatio || 2, 2);
  const canvas = document.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.borderRadius = '50%';
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Create floating blobs
  const blobs = [];
  for (let i = 0; i < 6; i++) {
    blobs.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (20 + Math.random() * 35) * dpr,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      color: palette[i % 3],
      phase: Math.random() * Math.PI * 2
    });
  }

  let t = 0;
  let animId;
  let running = true;

  function draw() {
    if (!running) return;
    t += 0.008;

    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    ctx.clip();

    // Rotating gradient background
    const gx1 = w / 2 + Math.cos(t) * w * 0.4;
    const gy1 = h / 2 + Math.sin(t * 0.7) * h * 0.4;
    const gx2 = w / 2 + Math.cos(t + Math.PI) * w * 0.4;
    const gy2 = h / 2 + Math.sin(t * 0.7 + Math.PI) * h * 0.4;

    const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(0.5, palette[1]);
    grad.addColorStop(1, palette[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Floating blobs
    blobs.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -b.r) b.x = w + b.r;
      if (b.x > w + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = h + b.r;
      if (b.y > h + b.r) b.y = -b.r;

      const pulse = 1 + Math.sin(t * 2 + b.phase) * 0.15;
      const rr = b.r * pulse;

      const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
      bg.addColorStop(0, b.color + '80');
      bg.addColorStop(0.6, b.color + '30');
      bg.addColorStop(1, b.color + '00');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
      ctx.fill();
    });

    // Specular highlight
    const hl = ctx.createRadialGradient(w * 0.35, h * 0.3, 0, w * 0.35, h * 0.3, w * 0.5);
    hl.addColorStop(0, 'rgba(255,255,255,0.14)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
    animId = requestAnimationFrame(draw);
  }

  draw();
  container.innerHTML = '';
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'material-symbols-outlined avatar-subject-icon';
  iconSpan.textContent = iconName;
  iconSpan.style.position = 'absolute';
  iconSpan.style.top = '50%';
  iconSpan.style.left = '50%';
  iconSpan.style.transform = 'translate(-50%, -50%)';
  iconSpan.style.fontSize = Math.round(size * 0.5) + 'px';
  iconSpan.style.color = 'white';
  iconSpan.style.textShadow = '0 4px 12px rgba(0,0,0,0.3)';
  iconSpan.style.zIndex = '3';
  iconSpan.style.animation = 'avatarSubjectFloat 4s ease-in-out infinite';

  container.appendChild(canvas);
  container.appendChild(iconSpan);

  return () => { running = false; cancelAnimationFrame(animId); };
}
