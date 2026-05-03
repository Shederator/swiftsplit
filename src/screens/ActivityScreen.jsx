/* ═══════════════════════════════════════════════════════════════
   HisabX — Activity Screen (React)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useStore } from '../hooks/useStore.js';
import { store } from '../store.js';
import { HomeHeader } from '../components/HeaderR.jsx';
import { formatCurrency, formatDate, getCategoryIcon } from '../utils.js';

export default function ActivityScreen() {
  const data = useStore();

  const allItems = [
    ...store.expenses.map(e => ({ ...e, type: 'expense' })),
    ...store.settlements.map(s => ({ ...s, type: 'settlement' })),
    ...store.wagers.map(w => ({ ...w, type: 'wager', date: w.createdAt }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <HomeHeader />
      <div className="page-content">
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 'var(--stack-gap)' }}>Activity</h2>
        <div className="activity-list stagger">
          {allItems.map((item, idx) => {
            if (item.type === 'settlement') return <SettlementItem key={`s-${item.id}`} item={item} />;
            if (item.type === 'wager') return <WagerItem key={`w-${item.id}`} item={item} />;
            return <ExpenseItem key={`e-${item.id}`} item={item} />;
          })}
          {allItems.length === 0 && (
            <div className="empty-state">
              <span className="material-symbols-outlined">history</span>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No activity yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SettlementItem({ item }) {
  const from = store.getMember(item.from);
  const to = store.getMember(item.to);
  const statusColor = item.status === 'confirmed' ? 'var(--green)' : item.status === 'rejected' ? 'var(--red)' : 'var(--amber)';
  const statusBg = item.status === 'confirmed' ? 'var(--green-subtle)' : item.status === 'rejected' ? 'var(--red-subtle)' : 'var(--amber-subtle)';
  const statusBorder = item.status === 'confirmed' ? 'rgba(0,214,143,0.15)' : item.status === 'rejected' ? 'rgba(255,107,107,0.15)' : 'rgba(255,217,61,0.15)';
  const statusIcon = item.status === 'confirmed' ? 'check_circle' : item.status === 'rejected' ? 'cancel' : 'hourglass_top';

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

  return (
    <div className="card activity-item" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${statusBorder}` }}>
        <span className="material-symbols-outlined" style={{ color: statusColor, fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{statusIcon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatDate(item.date)}</p>
      </div>
      <span style={{ fontSize: 16, fontWeight: 600, color: statusColor, flexShrink: 0 }}>{formatCurrency(item.amount)}</span>
    </div>
  );
}

function WagerItem({ item }) {
  const challenger = store.getMember(item.challengerId);
  const opponent = store.getMember(item.opponentId);
  const amIChallenger = item.challengerId === store.user.id;
  const amIOpponent = item.opponentId === store.user.id;

  let msg = '', subMsg = '';
  let statusColor = 'var(--amber)', statusBg = 'var(--amber-subtle)';
  let statusBorder = 'rgba(255,217,61,0.15)', statusIcon = 'casino';

  if (item.status === 'pending') {
    msg = amIChallenger ? `You challenged ${opponent?.name.split(' ')[0]}` : amIOpponent ? `${challenger?.name.split(' ')[0]} challenged you` : `${challenger?.name.split(' ')[0]} challenged ${opponent?.name.split(' ')[0]}`;
    subMsg = 'Pending acceptance';
  } else if (item.status === 'accepted' || item.status === 'ready') {
    msg = `Wager active between ${amIChallenger ? 'you' : challenger?.name.split(' ')[0]} and ${amIOpponent ? 'you' : opponent?.name.split(' ')[0]}`;
    subMsg = 'Waiting to flip';
  } else if (item.status === 'cancelled') {
    msg = 'Wager cancelled'; subMsg = 'Challenge declined';
    statusColor = 'var(--text-secondary)'; statusBg = 'var(--bg-input)';
    statusBorder = 'var(--border)'; statusIcon = 'do_not_disturb_on';
  } else if (item.status === 'resolved') {
    const iWon = item.winnerId === store.user.id;
    if (item.winnerId) {
      if (amIChallenger || amIOpponent) {
        if (iWon) {
          msg = 'You won the wager!'; statusColor = 'var(--green)'; statusBg = 'var(--green-subtle)';
          statusBorder = 'rgba(0,214,143,0.15)'; statusIcon = 'emoji_events';
        } else {
          msg = 'You lost the wager'; statusColor = 'var(--red)'; statusBg = 'var(--red-subtle)';
          statusBorder = 'rgba(255,107,107,0.15)'; statusIcon = 'sentiment_dissatisfied';
        }
      } else {
        const winner = store.getMember(item.winnerId);
        msg = `${winner?.name.split(' ')[0]} won the wager`;
        statusColor = 'var(--accent)'; statusBg = 'var(--accent-subtle)'; statusBorder = 'var(--border-accent)';
      }
    }
    subMsg = `Coin flip: ${item.resultData?.flip || 'heads'}`;
  }

  return (
    <div className="card activity-item" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${statusBorder}` }}>
        <span className="material-symbols-outlined" style={{ color: statusColor, fontSize: 20 }}>{statusIcon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{subMsg} · {formatDate(item.date)}</p>
      </div>
      <span style={{ fontSize: 16, fontWeight: 600, color: statusColor, flexShrink: 0 }}>{formatCurrency(item.amount)}</span>
    </div>
  );
}

function ExpenseItem({ item }) {
  const payer = store.getMember(item.paidBy);
  const group = store.getGroup(item.groupId);
  const isMe = item.paidBy === store.user.id;
  return (
    <div className="card activity-item" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)', fontSize: 20 }}>{getCategoryIcon(item.category)}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{isMe ? 'You' : payer?.name} paid{group ? ` · ${group.name}` : ''} · {formatDate(item.date)}</p>
      </div>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{formatCurrency(item.amount)}</span>
    </div>
  );
}
