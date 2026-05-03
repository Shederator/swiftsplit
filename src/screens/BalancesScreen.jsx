/* ═══════════════════════════════════════════════════════════════
   HisabX — Balances Screen (React)
   ═══════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore.js';
import { store } from '../store.js';
import { HomeHeader } from '../components/HeaderR.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, calculateBalances } from '../utils.js';

export default function BalancesScreen() {
  const data = useStore();
  const navigate = useNavigate();
  const showToast = useToast();
  const [settlingAll, setSettlingAll] = useState(false);

  const { user, members, expenses, settlements } = store;
  const balances = calculateBalances(expenses, settlements, members);

  const allPendingForMe = store.getPendingSettlementsForUser();

  const youOwe = [];
  const owedToYou = [];

  if (balances[user.id]) {
    Object.entries(balances[user.id]).forEach(([memberId, amount]) => {
      const member = store.getMember(memberId);
      if (!member) return;
      const pendingFromMember = allPendingForMe.filter(s => s.from === memberId).length;
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

  async function handleSettleAll() {
    setSettlingAll(true);
    for (const { member, amount } of youOwe) {
      await store.addSettlement(user.id, member.id, amount, '');
    }
    showToast('Settlements sent! Awaiting confirmations', 'success');
    setSettlingAll(false);
  }

  return (
    <>
      <HomeHeader />
      <div className="page-content stagger">
        {/* Hero Balance Card */}
        <section className="card-hero" style={{ marginBottom: 'var(--section-gap)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: net >= 0 ? 'var(--green)' : 'var(--red)' }}></div>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Your Net Balance</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
              {net >= 0 ? '' : '-'}₹{Math.round(Math.abs(net)).toLocaleString('en-IN')}
            </h1>
            <div className="summary-row" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid var(--border)' }}>
              <div className="summary-item">
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Owed to You</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>₹{Math.round(totalGet).toLocaleString('en-IN')}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-item">
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>You Owe</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>₹{Math.round(totalOwe).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pending Banner */}
        {totalPendingInbound > 0 && (
          <div className="pending-banner" style={{ marginBottom: 'var(--section-gap)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--amber-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,217,61,0.15)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--amber)', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{totalPendingInbound} payment{totalPendingInbound > 1 ? 's' : ''} awaiting your confirmation</p>
                <p style={{ fontSize: 12, color: 'var(--amber)' }}>Tap the balance to review and confirm</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Settle */}
        {(youOwe.length > 0 || owedToYou.length > 0) && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, marginBottom: 'var(--section-gap)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-accent)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Settle everything</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Clear all balances (needs receiver confirmation)</p>
            </div>
            <button className="btn-secondary" onClick={handleSettleAll} disabled={settlingAll} style={{
              whiteSpace: 'nowrap', height: 34, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '0 14px',
              background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-sm)'
            }}>{settlingAll ? 'Sending...' : 'Settle All'}</button>
          </div>
        )}

        {/* You Owe List */}
        {youOwe.length > 0 && (
          <section style={{ marginBottom: 'var(--section-gap)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--gutter)', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>You Owe</h2>
            <div className="balance-list stagger">
              {youOwe.map(({ member, amount, pendingSent }) => (
                <div key={member.id} className="card balance-item balance-card-link" onClick={() => navigate(`/balance-detail/${member.id}/owe`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', position: 'relative' }}>
                  <Avatar member={member} sizeClass="avatar-lg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</p>
                    <p style={{ fontSize: 12, color: pendingSent > 0 ? 'var(--amber)' : 'var(--red)' }}>
                      {pendingSent > 0 ? 'Payment pending confirmation' : 'Pending'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>{formatCurrency(amount)}</p>
                    {pendingSent > 0 && <span className="pending-dot pending-dot-amber"></span>}
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-disabled)' }}>chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Owed to You List */}
        {owedToYou.length > 0 && (
          <section style={{ marginBottom: 'var(--section-gap)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--gutter)', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>Owed to You</h2>
            <div className="balance-list stagger">
              {owedToYou.map(({ member, amount, pendingInbound }) => (
                <div key={member.id} className="card balance-item balance-card-link" onClick={() => navigate(`/balance-detail/${member.id}/owed`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', position: 'relative' }}>
                  <Avatar member={member} sizeClass="avatar-lg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</p>
                    <p style={{ fontSize: 12, color: pendingInbound > 0 ? 'var(--amber)' : 'var(--green)' }}>
                      {pendingInbound > 0 ? `${pendingInbound} payment${pendingInbound > 1 ? 's' : ''} to confirm` : 'Owes you'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(amount)}</p>
                    {pendingInbound > 0 && <span className="pending-dot pending-dot-amber"></span>}
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-disabled)' }}>chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {youOwe.length === 0 && owedToYou.length === 0 && (
          <div className="empty-state" style={{ marginTop: 'var(--space-8)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--green)' }}>check_circle</span>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 'var(--space-4) 0 6px' }}>All settled up!</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No pending balances</p>
          </div>
        )}
      </div>
    </>
  );
}
