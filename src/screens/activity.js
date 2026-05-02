/* HisabX — Activity Screen (Dark Theme) */

import { store } from '../store.js';
import { renderHomeHeader } from '../components/header.js';
import { formatCurrency, formatDate, renderAvatar, getCategoryIcon } from '../utils.js';

export default function activityScreen(container) {
  const allItems = [
    ...store.expenses.map(e => ({ ...e, type: 'expense' })),
    ...store.settlements.map(s => ({ ...s, type: 'settlement' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    ${renderHomeHeader()}
    <div class="page-content">
      <h2 style="font-size:24px;font-weight:700;color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:var(--stack-gap)">Activity</h2>
      <div class="activity-list stagger">
        ${allItems.map(item => {
          if (item.type === 'settlement') {
            const from = store.getMember(item.from);
            const to = store.getMember(item.to);
            const statusColor = item.status === 'confirmed' ? 'var(--green)' : item.status === 'rejected' ? 'var(--red)' : 'var(--amber)';
            const statusBg = item.status === 'confirmed' ? 'var(--green-subtle)' : item.status === 'rejected' ? 'var(--red-subtle)' : 'var(--amber-subtle)';
            const statusBorder = item.status === 'confirmed' ? 'rgba(0,214,143,0.15)' : item.status === 'rejected' ? 'rgba(255,107,107,0.15)' : 'rgba(255,217,61,0.15)';
            const statusIcon = item.status === 'confirmed' ? 'check_circle' : item.status === 'rejected' ? 'cancel' : 'hourglass_top';
            return `<div class="card activity-item" style="display:flex;align-items:center;gap:14px">
              <div style="width:42px;height:42px;border-radius:50%;background:${statusBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid ${statusBorder}">
                <span class="material-symbols-outlined" style="color:${statusColor};font-size:20px;font-variation-settings:'FILL' 1">${statusIcon}</span>
              </div>
              <div style="flex:1;min-width:0">
                ${(() => {
                  let msg = '';
                  const fromName = from?.id === store.user.id ? 'You' : from?.name;
                  const toName = to?.id === store.user.id ? 'you' : to?.name;
                  const fromPossessive = from?.id === store.user.id ? 'your' : `${from?.name}'s`;
                  
                  if (item.status === 'rejected') {
                    if (to?.id === store.user.id) msg = `You rejected ${fromPossessive} payment`;
                    else if (from?.id === store.user.id) msg = `${to?.name} rejected your payment`;
                    else msg = `${to?.name} rejected ${fromPossessive} payment`;
                  } else if (item.status === 'pending') {
                    if (from?.id === store.user.id) msg = `You sent a payment to ${to?.name}`;
                    else if (to?.id === store.user.id) msg = `${from?.name} sent you a payment`;
                    else msg = `${from?.name} sent a payment to ${to?.name}`;
                  } else {
                    msg = `${fromName} settled with ${toName}`;
                  }
                  return `<p style="font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${msg}</p>`;
                })()}
                <p style="font-size:12px;color:var(--text-tertiary)">${formatDate(item.date)}</p>
              </div>
              <span style="font-size:16px;font-weight:600;color:${statusColor};flex-shrink:0">${formatCurrency(item.amount)}</span>
            </div>`;
          }
          const payer = store.getMember(item.paidBy);
          const group = store.getGroup(item.groupId);
          const isMe = item.paidBy === store.user.id;
          return `<div class="card activity-item" style="display:flex;align-items:center;gap:14px">
            <div style="width:42px;height:42px;border-radius:50%;background:var(--bg-input);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border)">
              <span class="material-symbols-outlined" style="color:var(--text-secondary);font-size:20px">${getCategoryIcon(item.category)}</span>
            </div>
            <div style="flex:1;min-width:0">
              <p style="font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.description}</p>
              <p style="font-size:12px;color:var(--text-tertiary)">${isMe ? 'You' : payer?.name} paid · ${group?.name || ''} · ${formatDate(item.date)}</p>
            </div>
            <span style="font-size:16px;font-weight:600;color:var(--text-primary);flex-shrink:0">${formatCurrency(item.amount)}</span>
          </div>`;
        }).join('')}
        ${allItems.length === 0 ? '<div class="empty-state"><span class="material-symbols-outlined">history</span><p style="font-size:16px;font-weight:600;color:var(--text-primary)">No activity yet</p></div>' : ''}
      </div>
    </div>`;
}
