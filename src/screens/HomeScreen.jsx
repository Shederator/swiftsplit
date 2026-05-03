/* ═══════════════════════════════════════════════════════════════
   HisabX — Home Screen (React)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore.js';
import { store } from '../store.js';
import { HomeHeader } from '../components/HeaderR.jsx';
import { Avatar, AvatarStack } from '../components/Avatar.jsx';
import { formatCurrency, formatDate, calculateBalances, getNetBalance } from '../utils.js';

export default function HomeScreen() {
  const data = useStore();
  const navigate = useNavigate();
  const { user, groups, expenses, settlements, members } = store;

  const balances = calculateBalances(expenses, settlements, members);
  const net = getNetBalance(balances, user.id);

  let youOwe = 0, youGet = 0;
  if (balances[user.id]) {
    Object.entries(balances[user.id]).forEach(([, val]) => {
      if (val > 0) youOwe += val;
      else youGet += Math.abs(val);
    });
  }

  const sortedGroups = [...groups].sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));

  return (
    <>
      <HomeHeader />
      <div className="page-content stagger">
        {/* Greeting */}
        <section style={{ marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Hey, {user.name}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Here's your financial summary</p>
        </section>

        {/* Summary Card */}
        <section className="card-hero fade-up" style={{ marginTop: 'var(--stack-gap)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }}></div>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Net Balance</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
              {net >= 0 ? '' : '-'}₹{Math.round(Math.abs(net)).toLocaleString('en-IN')}
            </div>
            <div className="summary-row" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid var(--border)' }}>
              <div className="summary-item">
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>You Owe</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>₹{Math.round(youOwe).toLocaleString('en-IN')}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-item">
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>You Get</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>₹{Math.round(youGet).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Active Groups */}
        <section style={{ marginTop: 'var(--section-gap)' }}>
          <div className="section-header">
            <h3 className="section-title">Active Groups</h3>
            <button className="section-action" onClick={() => navigate('/create-group')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> New
            </button>
          </div>
          <div className="groups-grid stagger">
            {sortedGroups.map(group => {
              const groupMembers = store.getGroupMembers(group.id);
              const groupExpenses = store.getGroupExpenses(group.id);
              const memberIds = new Set(groupMembers.map(m => m.id));
              const groupSettlements = store.settlements.filter(s => memberIds.has(s.from) && memberIds.has(s.to));
              const gBalances = calculateBalances(groupExpenses, groupSettlements, groupMembers);
              const gNet = getNetBalance(gBalances, user.id);
              const isSettled = gNet === 0 && groupExpenses.length > 0;

              return (
                <div key={group.id} className="card group-card" onClick={() => navigate(`/group/${group.id}`)}>
                  <div className="group-card-top">
                    <div className="group-card-info">
                      <div className="group-icon-wrap">
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--accent)' }}>{group.icon}</span>
                      </div>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{group.name}</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{formatDate(group.lastActive)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="group-card-bottom">
                    <AvatarStack members={groupMembers} />
                    <div style={{ textAlign: 'right' }}>
                      {isSettled ? (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Settled</span><br />
                          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-tertiary)' }}>₹0</span>
                        </>
                      ) : gNet > 0 ? (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>You Get</span><br />
                          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(gNet)}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>You Owe</span><br />
                          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>{formatCurrency(gNet)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
