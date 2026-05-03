/* HisabX — Balance Detail Screen (React) */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore.js';
import { store } from '../store.js';
import { Avatar } from '../components/Avatar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, calculateBalances, getCategoryIcon, formatDate } from '../utils.js';

function StatusBadge({ status }) {
  if (status === 'pending') return <span className="settlement-status-badge settlement-status-pending"><span className="settlement-status-dot settlement-status-dot-pending"></span>Awaiting confirmation</span>;
  if (status === 'rejected') return <span className="settlement-status-badge settlement-status-rejected"><span className="settlement-status-dot settlement-status-dot-rejected"></span>Rejected</span>;
  return <span className="settlement-status-badge settlement-status-confirmed"><span className="settlement-status-dot settlement-status-dot-confirmed"></span>Confirmed</span>;
}

export default function BalanceDetailScreen() {
  const data = useStore();
  const { memberId, direction } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [processingPay, setProcessingPay] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const { user, expenses, settlements, members } = store;
  const member = store.getMember(memberId);
  if (!member) return <div className="empty-state"><p>Member not found</p></div>;

  const balances = calculateBalances(expenses, settlements, members);
  const isYouOwe = direction === 'owe';
  let totalAmount = 0;
  if (balances[user.id] && balances[user.id][memberId]) totalAmount = Math.abs(balances[user.id][memberId]);

  const pendingFromMe = store.getPendingSettlementsTo(memberId);
  const pendingToMe = store.getPendingSettlementsFrom(memberId);
  const totalPendingFromMe = pendingFromMe.reduce((s, p) => s + p.amount, 0);
  const totalPendingToMe = pendingToMe.reduce((s, p) => s + p.amount, 0);
  const remainingToPay = totalAmount - totalPendingFromMe;

  // Relevant expenses
  const relevantExpenses = expenses.filter(exp => {
    const theyPaidMe = exp.paidBy === memberId && (exp.splitBetween || []).includes(user.id);
    const iPaidThem = exp.paidBy === user.id && (exp.splitBetween || []).includes(memberId);
    return theyPaidMe || iPaidThem;
  });

  const breakdownItems = relevantExpenses.map(exp => {
    let rawShare = 0;
    const iPaidThem = exp.paidBy === user.id;
    const targetMember = iPaidThem ? memberId : user.id;
    if (exp.splitMethod === 'exact' && exp.splitData) rawShare = Number(exp.splitData[targetMember] || 0);
    else if (exp.splitMethod === 'weight' && exp.splitData) {
      const tw = Object.values(exp.splitData).reduce((sum, w) => sum + Number(w || 0), 0);
      rawShare = tw > 0 ? (exp.amount * Number(exp.splitData[targetMember] || 0)) / tw : 0;
    } else rawShare = exp.amount / (exp.splitBetween || []).length;
    const increasesBalance = isYouOwe ? !iPaidThem : iPaidThem;
    const shareAmount = increasesBalance ? rawShare : -rawShare;
    const group = store.getGroup(exp.groupId);
    let desc = exp.description;
    if (desc === 'Haggle Wager') desc = exp.paidBy === user.id ? 'Won Haggle Wager' : 'Lost Haggle Wager';
    return { id: exp.id, description: desc, category: exp.category || 'other', totalAmount: exp.amount, shareAmount, date: exp.date, groupName: group ? group.name : (exp.category === 'entertainment' ? 'Wager' : 'Direct Expense'), groupIcon: group ? group.icon : (exp.category === 'entertainment' ? '' : '📋') };
  }).filter(item => item.shareAmount !== 0);

  const confirmedSettledTotal = settlements.filter(s => s.status === 'confirmed').filter(s => isYouOwe ? (s.from === user.id && s.to === memberId) : (s.from === memberId && s.to === user.id)).reduce((sum, s) => sum + s.amount, 0);
  const effectivelySettledTotal = confirmedSettledTotal + (isYouOwe ? totalPendingFromMe : 0);
  let remaining = effectivelySettledTotal;
  breakdownItems.sort((a, b) => new Date(a.date) - new Date(b.date));
  const currentItems = [];
  for (const item of breakdownItems) {
    if (item.shareAmount < 0) currentItems.push(item);
    else if (remaining >= item.shareAmount) remaining -= item.shareAmount;
    else if (remaining > 0) { currentItems.push({ ...item, shareAmount: item.shareAmount - remaining }); remaining = 0; }
    else currentItems.push(item);
  }
  currentItems.sort((a, b) => {
    const wA = a.groupName === 'Wager' ? 1 : 0, wB = b.groupName === 'Wager' ? 1 : 0;
    if (wA !== wB) return wA - wB;
    return new Date(b.date) - new Date(a.date);
  });

  const activeWager = store.wagers.find(w => ['pending', 'accepted', 'ready'].includes(w.status) && ((w.opponentId === user.id && w.challengerId === memberId) || (w.challengerId === user.id && w.opponentId === memberId)));
  const showHaggleBadge = !!activeWager;

  async function handleConfirm(sid) {
    try { await store.confirmSettlement(sid); showToast('Payment confirmed!', 'success'); }
    catch (e) { showToast('Failed to confirm payment', 'error'); }
  }
  async function handleReject(sid) {
    try { await store.rejectSettlement(sid); showToast('Payment rejected', 'info'); }
    catch (e) { showToast('Failed to reject payment', 'error'); }
  }
  async function handlePay() {
    if (!member.upiId) { showToast('This member has not set up their UPI ID', 'error'); return; }
    const upiUri = `upi://pay?pa=${member.upiId}&pn=${encodeURIComponent(member.name)}&am=${remainingToPay}&cu=INR`;
    window.location.href = upiUri;
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', handleVis);
        setShowVerifyModal(true);
      }
    };
    setTimeout(() => document.addEventListener('visibilitychange', handleVis), 1000);
  }

  return (
    <>
      <div className="balance-detail-header">
        <button className="btn-icon balance-detail-back" onClick={() => navigate('/balances')}><span className="material-symbols-outlined">arrow_back</span></button>
        <span className="balance-detail-header-title">Balance Details</span>
        <div style={{ width: 40 }}></div>
      </div>
      <div className="page-content stagger" style={{ paddingTop: 8 }}>
        {/* Hero */}
        <div className="balance-detail-hero">
          <div className="balance-detail-hero-glow" style={{ '--glow-color': isYouOwe ? 'var(--red)' : 'var(--green)' }}></div>
          <div className="balance-detail-avatar-section">
            <Avatar member={member} />
            <div>
              <h2 className="balance-detail-name">{member.name}</h2>
              <span className="balance-detail-status" style={{ color: isYouOwe ? 'var(--red)' : 'var(--green)' }}>{isYouOwe ? 'You owe' : 'Owes you'}</span>
            </div>
          </div>
          <div className="balance-detail-amount-display">
            <span className="balance-detail-currency" style={{ color: isYouOwe ? 'var(--red)' : 'var(--green)' }}>₹</span>
            <span className="balance-detail-amount" style={{ color: isYouOwe ? 'var(--red)' : 'var(--green)' }}>{Math.round(isYouOwe ? Math.max(0, remainingToPay) : totalAmount).toLocaleString('en-IN')}</span>
          </div>
          {(totalPendingFromMe > 0 || totalPendingToMe > 0) && (
            <div className="balance-detail-summary-bar">
              {totalPendingFromMe > 0 && <div className="balance-detail-summary-item"><span className="balance-detail-summary-label">Pending confirmation</span><span className="balance-detail-summary-value" style={{ color: 'var(--amber)' }}>₹{Math.round(totalPendingFromMe).toLocaleString('en-IN')}</span></div>}
              {totalPendingToMe > 0 && <div className="balance-detail-summary-item"><span className="balance-detail-summary-label">Needs your confirmation</span><span className="balance-detail-summary-value" style={{ color: 'var(--amber)' }}>₹{Math.round(totalPendingToMe).toLocaleString('en-IN')}</span></div>}
            </div>
          )}
        </div>

        {/* Pending Confirmations (receiver) */}
        {pendingToMe.length > 0 && (
          <section className="pending-confirm-section">
            <div className="balance-detail-section-header">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--amber)' }}>notifications_active</span>
              <h3>Pending Confirmations</h3>
              <span className="balance-detail-count" style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', borderColor: 'rgba(255,217,61,0.2)' }}>{pendingToMe.length}</span>
            </div>
            <div className="balance-detail-expense-list">
              {pendingToMe.map(ps => {
                const fromMember = store.getMember(ps.from);
                const group = ps.groupId ? store.getGroup(ps.groupId) : null;
                return (
                  <div key={ps.id} className="pending-confirm-card">
                    <div className="pending-confirm-glow"></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                      <div className="balance-detail-expense-icon" style={{ background: 'var(--amber-subtle)', borderColor: 'rgba(255,217,61,0.15)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--amber)', fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                      </div>
                      <div className="balance-detail-expense-info">
                        <p className="balance-detail-expense-desc">{fromMember ? fromMember.name : 'Someone'} sent payment</p>
                        <div className="balance-detail-expense-meta">{group && <><span>{group.icon} {group.name}</span><span className="balance-detail-expense-dot"></span></>}<span>{formatDate(ps.date)}</span></div>
                      </div>
                      <div className="balance-detail-expense-amounts"><p className="balance-detail-expense-share" style={{ color: 'var(--amber)' }}>{formatCurrency(ps.amount)}</p></div>
                    </div>
                    <div className="pending-confirm-actions" style={{ position: 'relative', zIndex: 1 }}>
                      <button className="pending-reject-btn" onClick={() => handleReject(ps.id)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span> Reject</button>
                      <button className="pending-confirm-btn" onClick={() => handleConfirm(ps.id)}><span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span> Confirm Received</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Awaiting Confirmation (sender) */}
        {pendingFromMe.length > 0 && (
          <section className="pending-awaiting-section">
            <div className="balance-detail-section-header">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--amber)' }}>hourglass_top</span>
              <h3>Awaiting Confirmation</h3>
            </div>
            <div className="balance-detail-expense-list">
              {pendingFromMe.map(ps => {
                const group = ps.groupId ? store.getGroup(ps.groupId) : null;
                return (
                  <div key={ps.id} className="balance-detail-expense-item pending-awaiting-item" style={{ borderColor: 'rgba(255,217,61,0.15)' }}>
                    <div className="balance-detail-expense-icon" style={{ background: 'var(--amber-subtle)', borderColor: 'rgba(255,217,61,0.15)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--amber)', fontVariationSettings: "'FILL' 1" }}>schedule_send</span>
                    </div>
                    <div className="balance-detail-expense-info"><p className="balance-detail-expense-desc">Payment sent</p><div className="balance-detail-expense-meta">{group && <><span>{group.icon} {group.name}</span><span className="balance-detail-expense-dot"></span></>}<span>{formatDate(ps.date)}</span></div></div>
                    <div className="balance-detail-expense-amounts" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}><p className="balance-detail-expense-share" style={{ color: 'var(--amber)' }}>{formatCurrency(ps.amount)}</p><StatusBadge status="pending" /></div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Outstanding Expenses */}
        <section className="balance-detail-breakdown">
          <div className="balance-detail-section-header">
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--accent)' }}>receipt_long</span>
            <h3>Outstanding Expenses</h3>
            <span className="balance-detail-count">{currentItems.length} {currentItems.length === 1 ? 'item' : 'items'}</span>
          </div>
          {currentItems.length > 0 ? (
            <div className="balance-detail-expense-list">
              {currentItems.map(item => {
                const isDeduction = item.shareAmount < 0;
                const absShare = Math.abs(item.shareAmount);
                const color = isDeduction ? 'var(--text-secondary)' : (isYouOwe ? 'var(--red)' : 'var(--green)');
                return (
                  <div key={item.id} className="balance-detail-expense-item">
                    <div className="balance-detail-expense-icon" style={{ background: 'var(--bg-card)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-secondary)', fontVariationSettings: "'FILL' 1" }}>{getCategoryIcon(item.category)}</span>
                    </div>
                    <div className="balance-detail-expense-info">
                      <p className="balance-detail-expense-desc">{item.description}</p>
                      <div className="balance-detail-expense-meta"><span>{item.groupIcon ? item.groupIcon + ' ' : ''}{item.groupName}</span><span className="balance-detail-expense-dot"></span><span>{formatDate(item.date)}</span></div>
                    </div>
                    <div className="balance-detail-expense-amounts">
                      <p className="balance-detail-expense-share" style={{ color }}>{isDeduction ? '-' : ''}{formatCurrency(absShare)}</p>
                      <p className="balance-detail-expense-total">of {formatCurrency(item.totalAmount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="balance-detail-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--text-disabled)' }}>search_off</span>
              <p>No outstanding expenses</p>
            </div>
          )}
        </section>
        <div style={{ height: 160 }}></div>
      </div>

      {/* Bottom Actions */}
      <div className="balance-detail-actions">
        <div className="balance-detail-actions-inner">
          <button className="balance-detail-btn-haggle" onClick={() => navigate(`/haggle/${memberId}/${direction}`)} style={{ position: 'relative' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>forum</span>
              {showHaggleBadge && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--red)', borderRadius: '50%', boxShadow: '0 0 0 2px var(--bg-card)' }}></span>}
            </div>
            Haggle
          </button>
          {isYouOwe ? (
            <button className="balance-detail-btn-pay" onClick={handlePay} disabled={remainingToPay <= 0 || processingPay}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              {processingPay ? 'Processing...' : remainingToPay <= 0 ? 'Payment Pending…' : `Pay ₹${Math.round(remainingToPay).toLocaleString('en-IN')}`}
            </button>
          ) : (
            <button className="balance-detail-btn-nudge" onClick={() => showToast('Reminder sent!', 'info')}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
              Nudge {member.name.split(' ')[0]}
            </button>
          )}
        </div>
      </div>
      {/* Payment Verification Modal */}
      {showVerifyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div className="stagger" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>payment</span>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Payment Verification</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Was the payment completed successfully on your UPI app?</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button 
                onClick={() => { setShowVerifyModal(false); showToast('Payment not recorded', 'info'); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', opacity: processingPay ? 0.5 : 1 }}
                disabled={processingPay}
              >No</button>
              <button 
                onClick={async () => {
                  setProcessingPay(true);
                  try {
                    await store.addSettlement(user.id, memberId, remainingToPay, '');
                    showToast(`Payment sent! Awaiting ${member.name.split(' ')[0]}'s confirmation`, 'success');
                    setShowVerifyModal(false);
                  } catch (e) {
                    showToast('Failed to record payment', 'error');
                  }
                  setProcessingPay(false);
                }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: processingPay ? 0.8 : 1 }}
                disabled={processingPay}
              >
                {processingPay ? <span className="material-symbols-outlined spin">progress_activity</span> : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
