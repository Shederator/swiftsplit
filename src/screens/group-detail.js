/* ═══════════════════════════════════════════════════════════════
   HisabX — Group Detail Screen (Dark Theme)
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { renderDetailHeader, bindBackButton } from '../components/header.js';
import { formatCurrency, formatTime, formatDateFull, renderAvatar, getCategoryIcon, calculateBalances, getNetBalance } from '../utils.js';
import { navigate } from '../router.js';

export default function groupDetailScreen(container, params) {
  const group = store.getGroup(params.id);
  if (!group) { container.innerHTML = '<div class="page-content"><p style="color:var(--text-secondary)">Group not found</p></div>'; return; }

  const members = store.getGroupMembers(group.id);
  const expenses = store.getGroupExpenses(group.id);
  const settlements = store.getGroupSettlements(group.id);
  const balances = calculateBalances(expenses, settlements, members);
  const net = getNetBalance(balances, store.user.id);
  const subtitle = net === 0 ? 'All settled up' : net > 0 ? `You get ${formatCurrency(net)}` : `You owe ${formatCurrency(net)}`;

  // Merge expenses & settlements into timeline
  const timeline = [
    ...expenses.map(e => ({ ...e, type: 'expense' })),
    ...settlements.map(s => ({ ...s, type: 'settlement' }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Group by date
  const grouped = {};
  timeline.forEach(item => {
    const key = formatDateFull(item.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  container.innerHTML = `
    ${renderDetailHeader(group.name, subtitle)}
    <div class="page-content timeline-content">
      ${Object.entries(grouped).map(([date, items]) => `
        <div class="timeline-date-header"><span class="date-pill">${date}</span></div>
        ${items.map(item => {
          if (item.type === 'settlement') {
            const fromMember = store.getMember(item.from);
            const toMember = store.getMember(item.to);
            return `<div class="timeline-system">
              <span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">check_circle</span>
              ${fromMember?.name || 'Someone'} settled ₹${item.amount.toLocaleString('en-IN')} with ${toMember?.name || 'Someone'}
            </div>`;
          }
          const payer = store.getMember(item.paidBy);
          const isMe = item.paidBy === store.user.id;
          const splits = item.splitBetween || [];
          const perPerson = item.amount / splits.length;

          return `<div class="timeline-bubble ${isMe ? 'bubble-right' : 'bubble-left'}">
            ${!isMe ? `<div class="bubble-avatar">${renderAvatar(payer, 'avatar-sm')}</div>` : ''}
            <div class="bubble-content ${isMe ? 'bubble-primary' : 'bubble-surface'}">
              <div class="bubble-header">
                <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${isMe ? 'You' : payer?.name}</span>
                <span style="font-size:10px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em">paid for</span>
                <span class="material-symbols-outlined" style="font-size:14px;color:var(--text-tertiary)">${getCategoryIcon(item.category)}</span>
              </div>
              <div style="font-size:20px;font-weight:600;color:var(--text-primary);margin:4px 0">${formatCurrency(item.amount)}</div>
              <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${item.description}</div>
              <div class="bubble-splits">
                <p style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;opacity:0.8">Split between ${splits.length}</p>
                ${splits.map(mId => {
                  const m = store.getMember(mId);
                  let amountOwed = item.amount / splits.length;
                    if (item.splitMethod === 'exact' && item.splitData) amountOwed = Number(item.splitData[mId] || 0);
                    else if (item.splitMethod === 'weight' && item.splitData) {
                      const totalWeight = Object.values(item.splitData).reduce((sum, w) => sum + Number(w || 0), 0);
                      const weight = Number(item.splitData[mId] || 0);
                      amountOwed = totalWeight > 0 ? (item.amount * weight) / totalWeight : 0;
                    }
                  return `<div class="split-row"><span style="font-size:13px;opacity:0.9">${mId === store.user.id ? 'You' : m?.name}</span><span style="font-size:13px;font-weight:600;">${formatCurrency(amountOwed)}</span></div>`;
                }).join('')}
              </div>
            </div>
            <span class="bubble-time">${formatTime(item.date)}</span>
          </div>`;
        }).join('')}
      `).join('')}
      ${timeline.length === 0 ? '<div class="empty-state"><span class="material-symbols-outlined">receipt_long</span><p style="font-size:17px;font-weight:600;color:var(--text-primary);margin-bottom:6px">No expenses yet</p><p style="font-size:13px;color:var(--text-secondary)">Add your first expense to this group</p></div>' : ''}
    </div>
    <div class="detail-fab">
      <button class="fab ripple glow-pulse" id="add-expense-fab" aria-label="Add expense">
        <span class="material-symbols-outlined" style="font-size:24px">add</span>
      </button>
    </div>`;

  bindBackButton(container);

  const fab = container.querySelector('#add-expense-fab');
  if (fab) fab.addEventListener('click', () => navigate(`/add-expense/${group.id}`));
}
