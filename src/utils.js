/* ═══════════════════════════════════════════════════════════════
   HisabX — Utility Functions
   ═══════════════════════════════════════════════════════════════ */

export function formatCurrency(amount, showSign = false) {
  const abs = Math.round(Math.abs(amount));
  const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const sign = showSign ? (amount >= 0 ? '+' : '-') : '';
  return `${sign}₹${formatted}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const avatarColors = ['#6c5ce7','#00d68f','#ffd93d','#ff6b6b','#a855f7','#f472b6','#4ea8de','#fb923c'];

/* Curated gradient palettes for animated profile avatars */
const avatarPalettes = [
  ['#6c5ce7', '#a855f7', '#c084fc'],  // Purple dream
  ['#00d68f', '#06b6d4', '#22d3ee'],  // Aqua mint
  ['#f472b6', '#ec4899', '#a855f7'],  // Pink violet
  ['#fb923c', '#f59e0b', '#fbbf24'],  // Sunset gold
  ['#4ea8de', '#6366f1', '#8b5cf6'],  // Ocean indigo
  ['#ef4444', '#f97316', '#fb923c'],  // Fire ember
  ['#10b981', '#059669', '#34d399'],  // Emerald
  ['#8b5cf6', '#d946ef', '#f472b6'],  // Neon party
  ['#0ea5e9', '#38bdf8', '#7dd3fc'],  // Sky blue
  ['#f43f5e', '#fb7185', '#fda4af'],  // Rose
];

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getAvatarPalette(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalettes[Math.abs(hash) % avatarPalettes.length];
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

import { renderStaticAnimatedAvatar } from './components/animated-avatar.js';

export function renderAvatar(member, sizeClass = '') {
  const cls = sizeClass ? `avatar ${sizeClass}` : 'avatar';
  if (member.avatarPref) {
    if (member.avatarPref.type === 'custom' && member.avatarPref.image) {
      return `<img src="${member.avatarPref.image}" class="${cls}" alt="${member.name}" style="object-fit:cover">`;
    } else if (member.avatarPref.type === 'animated') {
      return renderStaticAnimatedAvatar(member.avatarPref.paletteIdx, sizeClass);
    }
  }

  const color = getAvatarColor(member.name);
  const initials = getInitials(member.name);
  return `<div class="${cls} avatar-initial" style="background:${color}">${initials}</div>`;
}

/** Renders a large animated profile avatar with gradient, mesh, orbs & glow ring */
export function renderProfileAvatar(member) {
  const [c1, c2, c3] = getAvatarPalette(member.name);
  const initials = getInitials(member.name);
  return `
    <div class="profile-avatar-wrap" style="--avatar-c1:${c1};--avatar-c2:${c2};--avatar-c3:${c3}">
      <div class="profile-avatar-glow"></div>
      <div class="profile-avatar-ring"></div>
      <div class="profile-avatar-main">
        <div class="profile-avatar-gradient"></div>
        <div class="profile-avatar-mesh"></div>
        <div class="profile-avatar-orb"></div>
        <div class="profile-avatar-orb"></div>
        <div class="profile-avatar-orb"></div>
        <span class="profile-avatar-initials">${initials}</span>
      </div>
    </div>`;
}

export function renderAvatarStack(members, max = 3) {
  const visible = members.slice(0, max);
  const extra = members.length - max;
  let html = '<div class="avatar-stack">';
  visible.forEach(m => { html += renderAvatar(m, 'avatar-sm'); });
  if (extra > 0) html += `<div class="avatar avatar-sm avatar-initial" style="background:var(--bg-elevated);color:var(--text-secondary);font-size:10px;font-weight:600;border-color:var(--bg-card)">+${extra}</div>`;
  html += '</div>';
  return html;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function calculateBalances(expenses, settlements, members) {
  const balances = {};
  members.forEach(m => { balances[m.id] = {}; members.forEach(m2 => { if (m.id !== m2.id) balances[m.id][m2.id] = 0; }); });

  expenses.forEach(exp => {
    const payer = exp.paidBy;
    const splits = exp.splitBetween || [];
    
    splits.forEach(memberId => {
      if (memberId !== payer) {
        let amountOwed = 0;
        if (exp.splitMethod === 'exact' && exp.splitData) {
          amountOwed = Number(exp.splitData[memberId] || 0);
        } else if (exp.splitMethod === 'weight' && exp.splitData) {
          const totalWeight = Object.values(exp.splitData).reduce((sum, w) => sum + Number(w || 0), 0);
          const weight = Number(exp.splitData[memberId] || 0);
          amountOwed = totalWeight > 0 ? (exp.amount * weight) / totalWeight : 0;
        } else {
          amountOwed = exp.amount / splits.length;
        }

        if (!balances[memberId]) balances[memberId] = {};
        if (!balances[payer]) balances[payer] = {};
        balances[memberId][payer] = (balances[memberId][payer] || 0) + amountOwed;
        balances[payer][memberId] = (balances[payer][memberId] || 0) - amountOwed;
      }
    });
  });

  // Only confirmed settlements reduce balances.
  // Pending settlements are visible in UI but don't affect the numbers.
  // This ensures multi-group accuracy: a pending payment in Group A
  // doesn't prematurely reduce what's owed across Group A + B combined.
  settlements.forEach(s => {
    if (s.status && s.status !== 'confirmed') return; // skip pending/rejected
    if (!balances[s.from]) balances[s.from] = {};
    if (!balances[s.to]) balances[s.to] = {};
    balances[s.from][s.to] = (balances[s.from][s.to] || 0) - s.amount;
    balances[s.to][s.from] = (balances[s.to][s.from] || 0) + s.amount;
  });

  return balances;
}

export function getNetBalance(balances, userId) {
  let net = 0;
  if (!balances[userId]) return 0;
  Object.values(balances[userId]).forEach(v => { net -= v; });
  return net;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

export function getCategoryIcon(category) {
  const icons = { food: 'restaurant', travel: 'directions_car', rent: 'home', shopping: 'shopping_bag', entertainment: 'movie', transport: 'local_taxi', groceries: 'local_grocery_store', health: 'health_and_safety', other: 'receipt_long' };
  return icons[category] || 'receipt_long';
}

export function getCategoryLabel(category) {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other';
}
