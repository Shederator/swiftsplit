/* ═══════════════════════════════════════════════════════════════
   HisabX — Group Detail Screen (React)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore.js';
import { store } from '../store.js';
import { DetailHeader } from '../components/HeaderR.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { formatCurrency, formatTime, formatDateFull, getCategoryIcon, calculateBalances, getNetBalance } from '../utils.js';

export default function GroupDetailScreen() {
  const data = useStore();
  const { id } = useParams();
  const navigate = useNavigate();

  const group = store.getGroup(id);
  if (!group) return <div className="page-content"><p style={{ color: 'var(--text-secondary)' }}>Group not found</p></div>;

  const members = store.getGroupMembers(group.id);
  const expenses = store.getGroupExpenses(group.id);
  const settlements = store.getGroupSettlements(group.id);
  const balances = calculateBalances(expenses, settlements, members);
  const net = getNetBalance(balances, store.user.id);
  const subtitle = net === 0 ? 'All settled up' : net > 0 ? `You get ${formatCurrency(net)}` : `You owe ${formatCurrency(net)}`;

  const timeline = [
    ...expenses.map(e => ({ ...e, type: 'expense' })),
    ...settlements.map(s => ({ ...s, type: 'settlement' }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const grouped = {};
  timeline.forEach(item => {
    const key = formatDateFull(item.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <>
      <DetailHeader title={group.name} subtitle={subtitle} />
      <div className="page-content timeline-content">
        {Object.entries(grouped).map(([date, items]) => (
          <React.Fragment key={date}>
            <div className="timeline-date-header"><span className="date-pill">{date}</span></div>
            {items.map(item => {
              if (item.type === 'settlement') {
                const fromMember = store.getMember(item.from);
                const toMember = store.getMember(item.to);
                return (
                  <div key={item.id} className="timeline-system">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {fromMember?.name || 'Someone'} settled ₹{item.amount.toLocaleString('en-IN')} with {toMember?.name || 'Someone'}
                  </div>
                );
              }

              const payer = store.getMember(item.paidBy);
              const isMe = item.paidBy === store.user.id;
              const splits = item.splitBetween || [];

              return (
                <div key={item.id} className={`timeline-bubble ${isMe ? 'bubble-right' : 'bubble-left'}`}>
                  {!isMe && <div className="bubble-avatar"><Avatar member={payer} sizeClass="avatar-sm" /></div>}
                  <div className={`bubble-content ${isMe ? 'bubble-primary' : 'bubble-surface'}`}>
                    <div className="bubble-header">
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{isMe ? 'You' : payer?.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>paid for</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{getCategoryIcon(item.category)}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>{formatCurrency(item.amount)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{item.description}</div>
                    <div className="bubble-splits">
                      <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, opacity: 0.8 }}>Split between {splits.length}</p>
                      {splits.map(mId => {
                        const m = store.getMember(mId);
                        let amountOwed = item.amount / splits.length;
                        if (item.splitMethod === 'exact' && item.splitData) amountOwed = Number(item.splitData[mId] || 0);
                        else if (item.splitMethod === 'weight' && item.splitData) {
                          const totalWeight = Object.values(item.splitData).reduce((sum, w) => sum + Number(w || 0), 0);
                          const weight = Number(item.splitData[mId] || 0);
                          amountOwed = totalWeight > 0 ? (item.amount * weight) / totalWeight : 0;
                        }
                        return (
                          <div key={mId} className="split-row">
                            <span style={{ fontSize: 13, opacity: 0.9 }}>{mId === store.user.id ? 'You' : m?.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(amountOwed)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <span className="bubble-time">{formatTime(item.date)}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
        {timeline.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined">receipt_long</span>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No expenses yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Add your first expense to this group</p>
          </div>
        )}
      </div>
      <div className="detail-fab">
        <button className="fab ripple glow-pulse" onClick={() => navigate(`/add-expense/${group.id}`)} aria-label="Add expense">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
        </button>
      </div>
    </>
  );
}
