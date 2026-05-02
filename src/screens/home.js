/* ═══════════════════════════════════════════════════════════════
   HisabX — Home Screen (Dark Theme)
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { renderHomeHeader } from '../components/header.js';
import { formatCurrency, formatDate, renderAvatarStack, calculateBalances, getNetBalance } from '../utils.js';
import { navigate } from '../router.js';

export default function homeScreen(container) {
  const { user, groups, expenses, settlements, members } = store;

  // Calculate overall balances
  const balances = calculateBalances(expenses, settlements, members);
  const net = getNetBalance(balances, user.id);

  let youOwe = 0, youGet = 0;
  if (balances[user.id]) {
    Object.entries(balances[user.id]).forEach(([, val]) => {
      if (val > 0) youOwe += val;
      else youGet += Math.abs(val);
    });
  }

  container.innerHTML = `
    ${renderHomeHeader()}
    <div class="page-content stagger">
      <!-- Greeting -->
      <section style="margin-bottom:6px">
        <h2 style="font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-0.02em">Hey, ${user.name}</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:2px">Here's your financial summary</p>
      </section>

      <!-- Summary Card -->
      <section class="card-hero fade-up" style="margin-top:var(--stack-gap)">
        <div style="position:relative;z-index:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <div style="width:6px;height:6px;border-radius:50%;background:var(--green)"></div>
            <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary)">Net Balance</span>
          </div>
          <div style="font-size:36px;font-weight:700;color:var(--text-primary);letter-spacing:-0.03em;margin-bottom:20px;font-variant-numeric:tabular-nums">${net >= 0 ? '' : '-'}₹${Math.round(Math.abs(net)).toLocaleString('en-IN')}</div>
          <div class="summary-row" style="background:rgba(255,255,255,0.03);border-radius:var(--radius-md);padding:14px;border:1px solid var(--border)">
            <div class="summary-item">
              <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px">You Owe</span>
              <span style="font-size:18px;font-weight:600;color:var(--red)">₹${Math.round(youOwe).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item">
              <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px">You Get</span>
              <span style="font-size:18px;font-weight:600;color:var(--green)">₹${Math.round(youGet).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Active Groups -->
      <section style="margin-top:var(--section-gap)">
        <div class="section-header">
          <h3 class="section-title">Active Groups</h3>
          <button class="section-action" id="btn-create-group">
            <span class="material-symbols-outlined" style="font-size:16px">add</span> New
          </button>
        </div>
        <div class="groups-grid stagger">
          ${groups.sort((a,b) => new Date(b.lastActive) - new Date(a.lastActive)).map(group => {
          const groupMembers = store.getGroupMembers(group.id);
            const groupExpenses = store.getGroupExpenses(group.id);
            // Use ALL settlements between group members (not just group-tagged ones)
            // so cross-group settlements from Pay/Settle-All are reflected
            const memberIds = new Set(groupMembers.map(m => m.id));
            const groupSettlements = store.settlements.filter(s =>
              memberIds.has(s.from) && memberIds.has(s.to)
            );
            const gBalances = calculateBalances(groupExpenses, groupSettlements, groupMembers);
            const gNet = getNetBalance(gBalances, user.id);
            const isSettled = gNet === 0 && groupExpenses.length > 0;

            return `<div class="card group-card" data-group="${group.id}">
              <div class="group-card-top">
                <div class="group-card-info">
                  <div class="group-icon-wrap">
                    <span class="material-symbols-outlined" style="font-size:20px;color:var(--accent)">${group.icon}</span>
                  </div>
                  <div>
                    <h4 style="font-size:15px;font-weight:600;color:var(--text-primary)">${group.name}</h4>
                    <p style="font-size:12px;color:var(--text-tertiary);margin-top:1px">${formatDate(group.lastActive)}</p>
                  </div>
                </div>
              </div>
              <div class="group-card-bottom">
                ${renderAvatarStack(groupMembers)}
                <div style="text-align:right">
                  ${isSettled
                    ? '<span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em">Settled</span><br><span style="font-size:18px;font-weight:600;color:var(--text-tertiary)">₹0</span>'
                    : gNet > 0
                      ? `<span style="font-size:11px;font-weight:500;color:var(--green);text-transform:uppercase;letter-spacing:0.05em">You Get</span><br><span style="font-size:18px;font-weight:600;color:var(--green)">${formatCurrency(gNet)}</span>`
                      : `<span style="font-size:11px;font-weight:500;color:var(--red);text-transform:uppercase;letter-spacing:0.05em">You Owe</span><br><span style="font-size:18px;font-weight:600;color:var(--red)">${formatCurrency(gNet)}</span>`
                  }
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </section>
    </div>`;

  // Events
  container.querySelectorAll('.group-card').forEach(card => {
    card.addEventListener('click', () => navigate(`/group/${card.dataset.group}`));
  });

  const createBtn = container.querySelector('#btn-create-group');
  if (createBtn) createBtn.addEventListener('click', () => navigate('/create-group'));

  const notifBtn = container.querySelector('#header-notifications');
  if (notifBtn) notifBtn.addEventListener('click', () => navigate('/activity'));
}
