/* ═══════════════════════════════════════════════════════════════
   HisabX — Balance Detail Screen (Expense Breakdown + Confirmation)
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, renderAvatar, calculateBalances, getCategoryIcon, getCategoryLabel, formatDate } from '../utils.js';
import { navigate } from '../router.js';

function showVerificationPopup(onConfirm, onCancel) {
  const existingOverlay = document.getElementById('payment-verification-overlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'payment-verification-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border-light);border-radius:24px;padding:24px;width:100%;max-width:320px;display:flex;flex-direction:column;gap:16px;box-shadow:0 10px 30px rgba(0,0,0,0.3);';
  
  modal.innerHTML = `
    <div style="text-align:center;">
      <div style="width:48px;height:48px;border-radius:24px;background:var(--accent-subtle);color:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <span class="material-symbols-outlined" style="font-size:24px;">payment</span>
      </div>
      <h3 style="margin:0 0 8px;font-size:18px;">Payment Verification</h3>
      <p style="margin:0;color:var(--text-secondary);font-size:14px;">Was the payment completed successfully on your UPI app?</p>
    </div>
    <div style="display:flex;gap:12px;margin-top:8px;">
      <button id="verify-no" style="flex:1;padding:12px;border-radius:12px;border:1px solid var(--border-light);background:transparent;color:var(--text-primary);font-weight:600;cursor:pointer;">No</button>
      <button id="verify-yes" style="flex:1;padding:12px;border-radius:12px;border:none;background:var(--accent);color:#fff;font-weight:600;cursor:pointer;">Yes</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  modal.querySelector('#verify-no').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  });
  
  modal.querySelector('#verify-yes').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  });
}

/** Render a status badge for settlement items */
function renderStatusBadge(status) {
  if (status === 'pending') {
    return `<span class="settlement-status-badge settlement-status-pending">
      <span class="settlement-status-dot settlement-status-dot-pending"></span>Awaiting confirmation
    </span>`;
  }
  if (status === 'rejected') {
    return `<span class="settlement-status-badge settlement-status-rejected">
      <span class="settlement-status-dot settlement-status-dot-rejected"></span>Rejected
    </span>`;
  }
  return `<span class="settlement-status-badge settlement-status-confirmed">
    <span class="settlement-status-dot settlement-status-dot-confirmed"></span>Confirmed
  </span>`;
}

export default function balanceDetailScreen(container, params) {
  const { memberId, direction } = params;
  const { user, members, expenses, settlements } = store;
  const member = store.getMember(memberId);

  if (!member) {
    container.innerHTML = `<div class="empty-state"><p>Member not found</p></div>`;
    return;
  }

  const balances = calculateBalances(expenses, settlements, members);
  const isYouOwe = direction === 'owe';

  // Calculate total (based on confirmed-only balances)
  let totalAmount = 0;
  if (balances[user.id] && balances[user.id][memberId]) {
    totalAmount = Math.abs(balances[user.id][memberId]);
  }

  // Pending settlements between this pair (multi-group aware)
  const pendingFromMe = store.getPendingSettlementsTo(memberId);   // I sent, awaiting their confirm
  const pendingToMe = store.getPendingSettlementsFrom(memberId);   // They sent, awaiting my confirm
  const totalPendingFromMe = pendingFromMe.reduce((s, p) => s + p.amount, 0);
  const totalPendingToMe = pendingToMe.reduce((s, p) => s + p.amount, 0);
  const remainingToPay = totalAmount - totalPendingFromMe;

  // Find all expenses between these two users (both directions)
  const relevantExpenses = expenses.filter(exp => {
    const theyPaidMe = exp.paidBy === memberId && (exp.splitBetween || []).includes(user.id);
    const iPaidThem = exp.paidBy === user.id && (exp.splitBetween || []).includes(memberId);
    return theyPaidMe || iPaidThem;
  });

  // Calculate individual expense shares
  const breakdownItems = relevantExpenses.map(exp => {
    let rawShare = 0;
    const iPaidThem = exp.paidBy === user.id;
    const targetMember = iPaidThem ? memberId : user.id;

    if (exp.splitMethod === 'exact' && exp.splitData) {
      rawShare = Number(exp.splitData[targetMember] || 0);
    } else if (exp.splitMethod === 'weight' && exp.splitData) {
      const totalWeight = Object.values(exp.splitData).reduce((sum, w) => sum + Number(w || 0), 0);
      const weight = Number(exp.splitData[targetMember] || 0);
      rawShare = totalWeight > 0 ? (exp.amount * weight) / totalWeight : 0;
    } else {
      rawShare = exp.amount / (exp.splitBetween || []).length;
    }

    const increasesBalance = isYouOwe ? !iPaidThem : iPaidThem;
    const shareAmount = increasesBalance ? rawShare : -rawShare;

    const group = store.getGroup(exp.groupId);

    let desc = exp.description;
    if (desc === 'Haggle Wager') {
      // If I paid, I won. If they paid, they won (I lost).
      desc = exp.paidBy === user.id ? 'Won Haggle Wager' : 'Lost Haggle Wager';
    }

    return {
      id: exp.id,
      description: desc,
      category: exp.category || 'other',
      totalAmount: exp.amount,
      shareAmount,
      date: exp.date,
      groupName: group ? group.name : (exp.category === 'entertainment' ? 'Wager' : 'Direct Expense'),
      groupIcon: group ? group.icon : (exp.category === 'entertainment' ? '' : '📋')
    };
  }).filter(item => item.shareAmount !== 0);

  // Trim expenses that are already covered by confirmed settlements.
  // We consume settlements from the oldest expense first, so only the
  // "remaining" unsettled expenses are shown — no confusing old data.
  const confirmedSettledTotal = settlements
    .filter(s => s.status === 'confirmed')
    .filter(s => isYouOwe ? (s.from === user.id && s.to === memberId) : (s.from === memberId && s.to === user.id))
    .reduce((sum, s) => sum + s.amount, 0);

  // If you are the sender, proactively deduct pending payments from the outstanding list
  // so they don't appear twice (once in list, once in pending card).
  // If rejected, pending drops to 0 and the expenses bounce back into the list.
  const effectivelySettledTotal = confirmedSettledTotal + (isYouOwe ? totalPendingFromMe : 0);

  let remaining = effectivelySettledTotal;
  // Sort oldest first for trimming
  breakdownItems.sort((a, b) => new Date(a.date) - new Date(b.date));
  const currentItems = [];
  for (const item of breakdownItems) {
    if (item.shareAmount < 0) {
      currentItems.push(item); // Negative items (deductions) are never trimmed
    } else if (remaining >= item.shareAmount) {
      remaining -= item.shareAmount; // fully covered, skip
    } else if (remaining > 0) {
      // partially covered — show only the remainder
      currentItems.push({ ...item, shareAmount: item.shareAmount - remaining });
      remaining = 0;
    } else {
      currentItems.push(item); // not covered at all
    }
  }
  // Re-sort newest first for display, but ensure wagers are always at the bottom
  currentItems.sort((a, b) => {
    const isWagerA = a.groupName === 'Wager' ? 1 : 0;
    const isWagerB = b.groupName === 'Wager' ? 1 : 0;
    if (isWagerA !== isWagerB) {
      return isWagerA - isWagerB;
    }
    return new Date(b.date) - new Date(a.date);
  });

  // Check for active actionable wagers
  const activeWager = store.wagers.find(w => 
    ['pending', 'accepted', 'ready'].includes(w.status) &&
    ((w.opponentId === user.id && w.challengerId === memberId) || 
     (w.challengerId === user.id && w.opponentId === memberId))
  );
  const showHaggleBadge = !!activeWager;

  // ── Build HTML ──
  container.innerHTML = `
    <!-- Header -->
    <div class="balance-detail-header">
      <button class="btn-icon balance-detail-back" id="back-btn">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <span class="balance-detail-header-title">Balance Details</span>
      <div style="width:40px"></div>
    </div>

    <div class="page-content stagger" style="padding-top:8px">
      <!-- Profile Hero -->
      <div class="balance-detail-hero">
        <div class="balance-detail-hero-glow" style="--glow-color:${isYouOwe ? 'var(--red)' : 'var(--green)'}"></div>
        <div class="balance-detail-avatar-section">
          ${renderAvatar(member)}
          <div>
            <h2 class="balance-detail-name">${member.name}</h2>
            <span class="balance-detail-status" style="color:${isYouOwe ? 'var(--red)' : 'var(--green)'}">
              ${isYouOwe ? 'You owe' : 'Owes you'}
            </span>
          </div>
        </div>

        <div class="balance-detail-amount-display">
          <span class="balance-detail-currency" style="color:${isYouOwe ? 'var(--red)' : 'var(--green)'}">₹</span>
          <span class="balance-detail-amount" style="color:${isYouOwe ? 'var(--red)' : 'var(--green)'}">${Math.round(isYouOwe ? Math.max(0, remainingToPay) : totalAmount).toLocaleString('en-IN')}</span>
        </div>

        ${/* Show pending info only when relevant */
        (totalPendingFromMe > 0 || totalPendingToMe > 0) ? `
        <div class="balance-detail-summary-bar">
          ${totalPendingFromMe > 0 ? `
          <div class="balance-detail-summary-item">
            <span class="balance-detail-summary-label">Pending confirmation</span>
            <span class="balance-detail-summary-value" style="color:var(--amber)">₹${Math.round(totalPendingFromMe).toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          ${totalPendingToMe > 0 ? `
          <div class="balance-detail-summary-item">
            <span class="balance-detail-summary-label">Needs your confirmation</span>
            <span class="balance-detail-summary-value" style="color:var(--amber)">₹${Math.round(totalPendingToMe).toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>

      ${/* ── RECEIVER: Pending Confirmation Cards ── */
      (pendingToMe.length > 0) ? `
      <section class="pending-confirm-section">
        <div class="balance-detail-section-header">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--amber)">notifications_active</span>
          <h3>Pending Confirmations</h3>
          <span class="balance-detail-count" style="background:var(--amber-subtle);color:var(--amber);border-color:rgba(255,217,61,0.2)">${pendingToMe.length}</span>
        </div>
        <div class="balance-detail-expense-list">
          ${pendingToMe.map((ps, idx) => {
            const fromMember = store.getMember(ps.from);
            const group = ps.groupId ? store.getGroup(ps.groupId) : null;
            return `
            <div class="pending-confirm-card" style="animation-delay:${(idx + 1) * 60}ms" data-settlement-id="${ps.id}">
              <div class="pending-confirm-glow"></div>
              <div style="display:flex;align-items:center;gap:12px;position:relative;z-index:1">
                <div class="balance-detail-expense-icon" style="background:var(--amber-subtle);border-color:rgba(255,217,61,0.15)">
                  <span class="material-symbols-outlined" style="font-size:18px;color:var(--amber);font-variation-settings:'FILL' 1">account_balance</span>
                </div>
                <div class="balance-detail-expense-info">
                  <p class="balance-detail-expense-desc">${fromMember ? fromMember.name : 'Someone'} sent payment</p>
                  <div class="balance-detail-expense-meta">
                    ${group ? `<span>${group.icon} ${group.name}</span><span class="balance-detail-expense-dot"></span>` : ''}
                    <span>${formatDate(ps.date)}</span>
                  </div>
                </div>
                <div class="balance-detail-expense-amounts">
                  <p class="balance-detail-expense-share" style="color:var(--amber)">${formatCurrency(ps.amount)}</p>
                </div>
              </div>
              <div class="pending-confirm-actions" style="position:relative;z-index:1">
                <button class="pending-reject-btn" data-sid="${ps.id}">
                  <span class="material-symbols-outlined" style="font-size:16px">close</span>
                  Reject
                </button>
                <button class="pending-confirm-btn" data-sid="${ps.id}">
                  <span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1">check_circle</span>
                  Confirm Received
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </section>
      ` : ''}

      ${/* ── SENDER: Pending awaiting confirmation banner ── */
      (pendingFromMe.length > 0) ? `
      <section class="pending-awaiting-section">
        <div class="balance-detail-section-header">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--amber)">hourglass_top</span>
          <h3>Awaiting Confirmation</h3>
        </div>
        <div class="balance-detail-expense-list">
          ${pendingFromMe.map((ps, idx) => {
            const group = ps.groupId ? store.getGroup(ps.groupId) : null;
            return `
            <div class="balance-detail-expense-item pending-awaiting-item" style="animation-delay:${(idx + 1) * 60}ms;border-color:rgba(255,217,61,0.15)">
              <div class="balance-detail-expense-icon" style="background:var(--amber-subtle);border-color:rgba(255,217,61,0.15)">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--amber);font-variation-settings:'FILL' 1">schedule_send</span>
              </div>
              <div class="balance-detail-expense-info">
                <p class="balance-detail-expense-desc">Payment sent</p>
                <div class="balance-detail-expense-meta">
                  ${group ? `<span>${group.icon} ${group.name}</span><span class="balance-detail-expense-dot"></span>` : ''}
                  <span>${formatDate(ps.date)}</span>
                </div>
              </div>
              <div class="balance-detail-expense-amounts" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                <p class="balance-detail-expense-share" style="color:var(--amber)">${formatCurrency(ps.amount)}</p>
                ${renderStatusBadge('pending')}
              </div>
            </div>`;
          }).join('')}
        </div>
      </section>
      ` : ''}

      <!-- Expense Breakdown (only current outstanding) -->
      <section class="balance-detail-breakdown">
        <div class="balance-detail-section-header">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--accent)">receipt_long</span>
          <h3>Outstanding Expenses</h3>
          <span class="balance-detail-count">${currentItems.length} ${currentItems.length === 1 ? 'item' : 'items'}</span>
        </div>

        ${currentItems.length > 0 ? `
        <div class="balance-detail-expense-list">
          ${currentItems.map((item, idx) => {
            const isDeduction = item.shareAmount < 0;
            const absShare = Math.abs(item.shareAmount);
            const color = isDeduction ? 'var(--text-secondary)' : (isYouOwe ? 'var(--red)' : 'var(--green)');
            const sign = isDeduction ? '-' : '';
            return `
            <div class="balance-detail-expense-item" style="animation-delay:${(idx + 1) * 60}ms">
              <div class="balance-detail-expense-icon" style="background:var(--bg-card)">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-secondary);font-variation-settings:'FILL' 1">${getCategoryIcon(item.category)}</span>
              </div>
              <div class="balance-detail-expense-info">
                <p class="balance-detail-expense-desc">${item.description}</p>
                <div class="balance-detail-expense-meta">
                  <span>${item.groupIcon ? item.groupIcon + ' ' : ''}${item.groupName}</span>
                  <span class="balance-detail-expense-dot"></span>
                  <span>${formatDate(item.date)}</span>
                </div>
              </div>
              <div class="balance-detail-expense-amounts">
                <p class="balance-detail-expense-share" style="color:${color}">
                  ${sign}${formatCurrency(absShare)}
                </p>
                <p class="balance-detail-expense-total">of ${formatCurrency(item.totalAmount)}</p>
              </div>
            </div>`;
          }).join('')}
        </div>
        ` : `
        <div class="balance-detail-empty">
          <span class="material-symbols-outlined" style="font-size:36px;color:var(--text-disabled)">search_off</span>
          <p>No outstanding expenses</p>
        </div>
        `}

      <!-- Spacer for bottom buttons -->
      <div style="height:160px"></div>
    </div>

    <!-- Bottom Action Buttons -->
    <div class="balance-detail-actions">
      <div class="balance-detail-actions-inner">
        ${isYouOwe ? `
          <button class="balance-detail-btn-haggle" id="haggle-btn" style="position:relative">
            <div style="position:relative; display:inline-flex">
              <span class="material-symbols-outlined" style="font-size:20px">forum</span>
              ${showHaggleBadge ? '<span style="position:absolute; top:-2px; right:-2px; width:8px; height:8px; background:var(--red); border-radius:50%; box-shadow:0 0 0 2px var(--bg-card)"></span>' : ''}
            </div>
            Haggle
          </button>
          <button class="balance-detail-btn-pay" id="pay-btn" ${remainingToPay <= 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">account_balance</span>
            ${remainingToPay <= 0 ? 'Payment Pending…' : `Pay ₹${Math.round(remainingToPay).toLocaleString('en-IN')}`}
          </button>
        ` : `
          <button class="balance-detail-btn-haggle" id="haggle-btn" style="position:relative">
            <div style="position:relative; display:inline-flex">
              <span class="material-symbols-outlined" style="font-size:20px">forum</span>
              ${showHaggleBadge ? '<span style="position:absolute; top:-2px; right:-2px; width:8px; height:8px; background:var(--red); border-radius:50%; box-shadow:0 0 0 2px var(--bg-card)"></span>' : ''}
            </div>
            Haggle
          </button>
          <button class="balance-detail-btn-nudge" id="nudge-btn">
            <span class="material-symbols-outlined" style="font-size:20px">notifications</span>
            Nudge ${member.name.split(' ')[0]}
          </button>
        `}
      </div>
    </div>
  `;

  // ── Events ──
  container.querySelector('#back-btn').addEventListener('click', () => navigate('/balances'));

  if (isYouOwe) {
    const payBtn = container.querySelector('#pay-btn');
    if (payBtn && !payBtn.disabled) {
      payBtn.addEventListener('click', async () => {
        if (!member.upiId) {
          showToast('This member has not set up their UPI ID', 'error');
          return;
        }

        const upiUri = `upi://pay?pa=${member.upiId}&pn=${encodeURIComponent(member.name)}&am=${remainingToPay}&cu=INR`;
        window.location.href = upiUri;
        
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            showVerificationPopup(async () => {
              payBtn.disabled = true;
              payBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;animation:spin 1s linear infinite">progress_activity</span> Processing...`;
              // Settlement is created as PENDING — receiver must confirm
              await store.addSettlement(user.id, memberId, remainingToPay, '');
              showToast(`Payment sent! Awaiting ${member.name.split(' ')[0]}'s confirmation`, 'success');
              // Re-render to show the pending state
              balanceDetailScreen(container, params);
            }, () => {
              showToast('Payment not recorded', 'info');
            });
          }
        };
        
        setTimeout(() => {
          document.addEventListener('visibilitychange', handleVisibilityChange);
        }, 1000);
      });
    }
  } else {
    const nudgeBtn = container.querySelector('#nudge-btn');
    if (nudgeBtn) {
      nudgeBtn.addEventListener('click', () => showToast('Reminder sent!', 'info'));
    }
  }

  // ── Receiver: Confirm/Reject pending payments ──
  container.querySelectorAll('.pending-confirm-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.sid;
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span> Confirming...`;
      try {
        await store.confirmSettlement(sid);
        showToast('Payment confirmed!', 'success');
        balanceDetailScreen(container, params);
      } catch (e) {
        showToast('Failed to confirm payment', 'error');
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1">check_circle</span> Confirm Received`;
      }
    });
  });

  container.querySelectorAll('.pending-reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.sid;
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite">progress_activity</span>`;
      try {
        await store.rejectSettlement(sid);
        showToast('Payment rejected', 'info');
        balanceDetailScreen(container, params);
      } catch (e) {
        showToast('Failed to reject payment', 'error');
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">close</span> Reject`;
      }
    });
  });

  container.querySelector('#haggle-btn').addEventListener('click', () => {
    navigate(`/haggle/${memberId}/${direction}`);
  });
}
