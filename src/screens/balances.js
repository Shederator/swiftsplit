/* ═══════════════════════════════════════════════════════════════
   HisabX — Balances & Settle Screen (Dark Theme)
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { renderHomeHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, renderAvatar, calculateBalances } from '../utils.js';
import { navigate } from '../router.js';

export default function balancesScreen(container) {
  const { user, members, expenses, settlements } = store;
  const balances = calculateBalances(expenses, settlements, members);

  // All pending settlements where I am the receiver (multi-group)
  const allPendingForMe = store.getPendingSettlementsForUser();

  const youOwe = [];
  const owedToYou = [];

  if (balances[user.id]) {
    Object.entries(balances[user.id]).forEach(([memberId, amount]) => {
      const member = store.getMember(memberId);
      if (!member) return;

      // Count pending settlements FROM that member TO me (needs my confirmation)
      const pendingFromMember = allPendingForMe.filter(s => s.from === memberId).length;
      // Count pending settlements FROM me TO that member (awaiting their confirmation)
      const pendingSentToMember = store.getPendingSettlementsTo(memberId).length;

      if (amount > 10 || pendingSentToMember > 0) {
        youOwe.push({ member, amount: Math.max(0, amount), pendingSent: pendingSentToMember });
      }
      if (amount < -10 || pendingFromMember > 0) {
        owedToYou.push({ member, amount: Math.abs(Math.min(0, amount)), pendingInbound: pendingFromMember });
      }
    });
  }

  const totalOwe = youOwe.reduce((s, i) => s + i.amount, 0);
  const totalGet = owedToYou.reduce((s, i) => s + i.amount, 0);
  const net = totalGet - totalOwe;
  const totalPendingInbound = allPendingForMe.length;

  container.innerHTML = `
    ${renderHomeHeader()}
    <div class="page-content stagger">
      <!-- Hero Balance Card -->
      <section class="card-hero" style="margin-bottom:var(--section-gap)">
        <div style="position:relative;z-index:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <div style="width:6px;height:6px;border-radius:50%;background:${net >= 0 ? 'var(--green)' : 'var(--red)'}"></div>
            <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary)">Your Net Balance</span>
          </div>
          <h1 style="font-size:36px;font-weight:700;color:var(--text-primary);letter-spacing:-0.03em;margin-bottom:20px;font-variant-numeric:tabular-nums">${net >= 0 ? '' : '-'}₹${Math.round(Math.abs(net)).toLocaleString('en-IN')}</h1>
          <div class="summary-row" style="background:rgba(255,255,255,0.03);border-radius:var(--radius-md);padding:14px;border:1px solid var(--border)">
            <div class="summary-item">
              <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px">Owed to You</span>
              <span style="font-size:18px;font-weight:600;color:var(--green)">₹${Math.round(totalGet).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item">
              <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px">You Owe</span>
              <span style="font-size:18px;font-weight:600;color:var(--red)">₹${Math.round(totalOwe).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </section>

      ${/* ── Pending Confirmation Banner ── */
      totalPendingInbound > 0 ? `
      <div class="pending-banner" style="margin-bottom:var(--section-gap)">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;border-radius:var(--radius-sm);background:var(--amber-subtle);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(255,217,61,0.15)">
            <span class="material-symbols-outlined" style="color:var(--amber);font-size:18px;font-variation-settings:'FILL' 1">notifications_active</span>
          </div>
          <div style="flex:1;min-width:0">
            <p style="font-size:14px;font-weight:600;color:var(--text-primary)">${totalPendingInbound} payment${totalPendingInbound > 1 ? 's' : ''} awaiting your confirmation</p>
            <p style="font-size:12px;color:var(--amber)">Tap the balance to review and confirm</p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Quick Settle -->
      ${(youOwe.length > 0 || owedToYou.length > 0) ? `
      <div class="card" style="display:flex;align-items:center;gap:14px;padding:14px;margin-bottom:var(--section-gap)">
        <div style="width:38px;height:38px;border-radius:var(--radius-sm);background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border-accent)">
          <span class="material-symbols-outlined" style="color:var(--accent);font-size:18px;font-variation-settings:'FILL' 1">electric_bolt</span>
        </div>
        <div style="flex:1;min-width:0">
          <p style="font-size:14px;font-weight:600;color:var(--text-primary)">Settle everything</p>
          <p style="font-size:12px;color:var(--text-tertiary)">Clear all balances (needs receiver confirmation)</p>
        </div>
        <button class="btn-secondary" style="white-space:nowrap;height:34px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:0 14px;background:var(--accent-subtle);color:var(--accent);border:1px solid var(--border-accent);border-radius:var(--radius-sm)" id="settle-all-btn">Settle All</button>
      </div>` : ''}

      <!-- You Owe List -->
      ${youOwe.length > 0 ? `
      <section style="margin-bottom:var(--section-gap)">
        <h2 style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--gutter);padding-bottom:10px;border-bottom:1px solid var(--border)">You Owe</h2>
        <div class="balance-list stagger">
          ${youOwe.map(({ member, amount, pendingSent }) => `
            <div class="card balance-item balance-card-link" data-member="${member.id}" data-dir="owe" style="display:flex;align-items:center;gap:14px;cursor:pointer;position:relative">
              ${renderAvatar(member, 'avatar-lg')}
              <div style="flex:1;min-width:0">
                <p style="font-size:14px;font-weight:600;color:var(--text-primary)">${member.name}</p>
                <p style="font-size:12px;color:${pendingSent > 0 ? 'var(--amber)' : 'var(--red)'}">${pendingSent > 0 ? `Payment pending confirmation` : 'Pending'}</p>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <p style="font-size:18px;font-weight:600;color:var(--red)">${formatCurrency(amount)}</p>
                ${pendingSent > 0 ? `<span class="pending-dot pending-dot-amber"></span>` : ''}
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-disabled)">chevron_right</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>` : ''}

      <!-- Owed to You List -->
      ${owedToYou.length > 0 ? `
      <section style="margin-bottom:var(--section-gap)">
        <h2 style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--gutter);padding-bottom:10px;border-bottom:1px solid var(--border)">Owed to You</h2>
        <div class="balance-list stagger">
          ${owedToYou.map(({ member, amount, pendingInbound }) => `
            <div class="card balance-item balance-card-link" data-member="${member.id}" data-dir="owed" style="display:flex;align-items:center;gap:14px;cursor:pointer;position:relative">
              ${renderAvatar(member, 'avatar-lg')}
              <div style="flex:1;min-width:0">
                <p style="font-size:14px;font-weight:600;color:var(--text-primary)">${member.name}</p>
                <p style="font-size:12px;color:${pendingInbound > 0 ? 'var(--amber)' : 'var(--green)'}">${pendingInbound > 0 ? `${pendingInbound} payment${pendingInbound > 1 ? 's' : ''} to confirm` : 'Owes you'}</p>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <p style="font-size:18px;font-weight:600;color:var(--green)">${formatCurrency(amount)}</p>
                ${pendingInbound > 0 ? `<span class="pending-dot pending-dot-amber"></span>` : ''}
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-disabled)">chevron_right</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>` : ''}

      ${youOwe.length === 0 && owedToYou.length === 0 ? `
      <div class="empty-state" style="margin-top:var(--space-8)">
        <span class="material-symbols-outlined" style="font-size:52px;color:var(--green)">check_circle</span>
        <p style="font-size:17px;font-weight:600;color:var(--text-primary);margin:var(--space-4) 0 6px">All settled up!</p>
        <p style="font-size:13px;color:var(--text-secondary)">No pending balances</p>
      </div>` : ''}
    </div>`;

  // Events — Navigate to balance detail on card click
  container.querySelectorAll('.balance-card-link').forEach(card => {
    card.addEventListener('click', () => {
      const memberId = card.dataset.member;
      const dir = card.dataset.dir;
      navigate(`/balance-detail/${memberId}/${dir}`);
    });
  });

  const settleAllBtn = container.querySelector('#settle-all-btn');
  if (settleAllBtn) {
    settleAllBtn.addEventListener('click', async () => {
      settleAllBtn.disabled = true;
      settleAllBtn.textContent = 'Sending...';
      // All settlements go through the pending flow — receivers must confirm each
      for (const { member, amount } of youOwe) {
        await store.addSettlement(user.id, member.id, amount, '');
      }
      showToast('Settlements sent! Awaiting confirmations', 'success');
      balancesScreen(container);
    });
  }
}
