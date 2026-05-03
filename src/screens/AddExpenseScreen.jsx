/* HisabX — Add Expense Screen (React) */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import { DetailHeader } from '../components/HeaderR.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency } from '../utils.js';

const categories = [
  { id: 'food', icon: 'restaurant', label: 'Food' },
  { id: 'travel', icon: 'directions_car', label: 'Travel' },
  { id: 'rent', icon: 'home', label: 'Rent' },
  { id: 'shopping', icon: 'shopping_bag', label: 'Shopping' },
  { id: 'entertainment', icon: 'movie', label: 'Fun' },
  { id: 'other', icon: 'receipt_long', label: 'Other' }
];

export default function AddExpenseScreen() {
  const { groupId: preselectedGroupId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const groups = store.groups;
  const selectedGroup = preselectedGroupId ? store.getGroup(preselectedGroupId) : groups[0];

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy] = useState(store.user.id);
  const [groupId, setGroupId] = useState(selectedGroup?.id || '');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [splitMembers, setSplitMembers] = useState(selectedGroup ? [...selectedGroup.members] : []);
  const [splitData, setSplitData] = useState({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const group = store.getGroup(groupId);
  const groupMembers = group ? store.getGroupMembers(group.id) : [];
  const payer = store.getMember(paidBy);
  const splitCount = splitMembers.length || 1;
  const amountVal = Number(amount) || 0;
  const perPerson = amountVal ? Math.round(amountVal / splitCount) : 0;

  // Initialize weights if needed
  if (splitMethod === 'weight' && Object.keys(splitData).length === 0 && splitMembers.length > 0) {
    const init = {};
    splitMembers.forEach(id => { init[id] = 1; });
    // We'll use this inline instead of setting state in render
  }
  const effectiveSplitData = splitMethod === 'weight' && Object.keys(splitData).length === 0
    ? splitMembers.reduce((acc, id) => { acc[id] = 1; return acc; }, {})
    : splitData;

  function handleGroupChange(newGroupId) {
    setGroupId(newGroupId);
    const g = store.getGroup(newGroupId);
    if (g) { setSplitMembers([...g.members]); setSplitData({}); }
  }

  function handleSplitMethodChange(method) {
    setSplitMethod(method);
    if (method === 'weight') setSplitData({});
  }

  function toggleSplitMember(id) {
    setSplitMembers(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) { showToast('Must split with at least 1 person', 'error'); return prev; }
        const next = prev.filter(m => m !== id);
        const nd = { ...splitData }; delete nd[id];
        setSplitData(splitMethod === 'weight' ? {} : nd);
        return next;
      }
      if (splitMethod === 'weight') setSplitData({});
      return [...prev, id];
    });
  }

  function handleWeightChange(id, action) {
    const cur = Number(effectiveSplitData[id] || 0);
    const val = action === 'plus' ? cur + 1 : Math.max(0, cur - 1);
    setSplitData({ ...effectiveSplitData, [id]: val });
  }

  async function handleSave() {
    if (!amountVal || amountVal <= 0) { showToast('Please enter an amount', 'error'); return; }
    if (!description) { showToast('Please add a description', 'error'); return; }
    if (splitMethod === 'exact') {
      const sum = splitMembers.reduce((s, id) => s + Number(effectiveSplitData[id] || 0), 0);
      if (sum !== amountVal) { showToast(`Exact amounts must sum to ₹${amountVal}`, 'error'); return; }
    } else if (splitMethod === 'weight') {
      const sum = splitMembers.reduce((s, id) => s + Number(effectiveSplitData[id] || 0), 0);
      if (sum === 0) { showToast('Total weight must be greater than 0', 'error'); return; }
    }
    setSaving(true);
    await store.addExpense(groupId, amountVal, description, category, paidBy, splitMembers, splitMethod, effectiveSplitData);
    showToast('Expense added!', 'success');
    navigate(-1);
  }

  // Exact split details
  const exactTotal = splitMembers.reduce((sum, id) => sum + Number(effectiveSplitData[id] || 0), 0);
  const exactRemaining = amountVal - exactTotal;
  // Weight split
  const totalWeight = splitMembers.reduce((sum, id) => sum + Number(effectiveSplitData[id] || 0), 0);
  const weightColors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#e84393', '#00cec9', '#d63031'];

  return (
    <>
      <DetailHeader title="Add Expense" />
      <div className="page-content">
        {/* Amount */}
        <section className="card" style={{ textAlign: 'center', padding: '24px 20px 20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(108,92,231,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 180, height: 180, background: 'var(--accent)', filter: 'blur(80px)', opacity: 0.12, pointerEvents: 'none' }}></div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, position: 'relative', zIndex: 1, opacity: 0.9 }}>Enter Amount</p>
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.03em' }}>₹</span>
            <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" autoFocus
              style={{ fontSize: 48, fontWeight: 700, width: `calc(${Math.max(1, amount.length)}ch + 16px)`, textAlign: 'center', fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 8px rgba(0,0,0,0.2)', caretColor: 'var(--accent)', padding: 0, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <div className="input-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 18 }}>edit_note</span>
            <input type="text" className="input-field" placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)', padding: '12px 14px 12px 42px', fontSize: 14, borderRadius: 'var(--radius-sm)' }} />
          </div>
        </section>

        {/* Category */}
        <section style={{ marginTop: 'var(--section-gap)' }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 'var(--gutter)' }}>Category</h2>
          <div className="chips-scroll">
            {categories.map(cat => (
              <button key={cat.id} className={`chip ${category === cat.id ? 'chip-active' : 'chip-default'}`} onClick={() => setCategory(cat.id)}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: category === cat.id ? "'FILL' 1" : "'FILL' 0" }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Split Details */}
        <section style={{ marginTop: 'var(--section-gap)' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="split-row-item" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gutter)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>account_balance_wallet</span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Paid by</span>
              </div>
              <div className="payer-badge">
                {payer && <Avatar member={payer} sizeClass="avatar-sm" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{payer?.id === store.user.id ? 'You' : payer?.name}</span>
              </div>
            </div>
            <div className="split-row-item ripple" onClick={() => setIsSheetOpen(true)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gutter)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>group</span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Split with</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>{splitCount === groupMembers.length ? 'Everyone' : `${splitCount} people`}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>chevron_right</span>
              </div>
            </div>
          </div>
        </section>

        {/* Split Method */}
        <section style={{ marginTop: 'var(--section-gap)' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Split Method</h2>
            </div>
            <div className="split-toggle">
              <div className="split-toggle-track">
                {['equal', 'exact', 'weight'].map(m => (
                  <button key={m} className={`split-toggle-btn ${splitMethod === m ? 'active' : ''}`} onClick={() => handleSplitMethodChange(m)}>
                    {m === 'equal' ? 'Equally' : m === 'exact' ? 'Exact' : 'Weight'}
                  </button>
                ))}
              </div>
            </div>
            {splitMethod === 'equal' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 2px 0', marginTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{splitCount} people</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>₹{perPerson.toLocaleString('en-IN')} / person</span>
              </div>
            )}
            {splitMethod === 'exact' && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Total: ₹{amountVal}</span>
                  <span style={{ fontSize: 12, color: exactRemaining === 0 ? 'var(--green)' : 'var(--red)' }}>{exactRemaining === 0 ? 'Matches total' : `Remaining: ₹${exactRemaining}`}</span>
                </div>
                {splitMembers.map(mId => {
                  const m = store.getMember(mId);
                  return (
                    <div key={mId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {m && <Avatar member={m} sizeClass="avatar-sm" />}
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{mId === store.user.id ? 'You' : m?.name}</span>
                      </div>
                      <div className="input-wrapper" style={{ width: 100 }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 14 }}>₹</span>
                        <input type="number" value={effectiveSplitData[mId] || ''} placeholder="0"
                          onChange={e => setSplitData({ ...effectiveSplitData, [mId]: e.target.value })}
                          style={{ padding: '8px 8px 8px 24px', fontSize: 14, textAlign: 'right' }} className="input-field" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {splitMethod === 'weight' && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {totalWeight > 0 && (
                  <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {splitMembers.map((mId, idx) => {
                      const val = Number(effectiveSplitData[mId] || 0);
                      if (val <= 0) return null;
                      const pct = (val / totalWeight) * 100;
                      return <div key={mId} style={{ width: `${pct}%`, background: weightColors[idx % weightColors.length] }} title={`${val} shares`}></div>;
                    })}
                  </div>
                )}
                {splitMembers.map((mId, idx) => {
                  const m = store.getMember(mId);
                  const val = Number(effectiveSplitData[mId] || 0);
                  const pct = totalWeight > 0 ? (val / totalWeight) * 100 : 0;
                  const computedAmt = totalWeight > 0 ? amountVal * (val / totalWeight) : 0;
                  const color = weightColors[idx % weightColors.length];
                  return (
                    <div key={mId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {m && <Avatar member={m} sizeClass="avatar-sm" />}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{mId === store.user.id ? 'You' : m?.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{pct.toFixed(0)}% • ₹{computedAmt.toFixed(0)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-full)', padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => handleWeightChange(mId, 'minus')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center', color: 'var(--text-primary)' }}>{val}</span>
                        <button onClick={() => handleWeightChange(mId, 'plus')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Date & Group */}
        <section style={{ marginTop: 'var(--section-gap)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gutter)' }}>
          <div className="card" style={{ padding: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-tertiary)', marginBottom: 8, display: 'block' }}>calendar_today</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>Date</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Today</span>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-tertiary)', marginBottom: 8, display: 'block' }}>{group?.icon || 'group'}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>Group</span>
            <select value={groupId} onChange={e => handleGroupChange(e.target.value)} style={{ fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--text-primary)', width: '100%', cursor: 'pointer', border: 'none', outline: 'none', padding: 0 }}>
              {groups.map(g => <option key={g.id} value={g.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{g.name}</option>)}
            </select>
          </div>
        </section>
        <div style={{ height: 100 }}></div>
      </div>

      {/* Save Button */}
      <div className="fixed-bottom-action">
        <button className="btn btn-primary ripple" onClick={handleSave} disabled={saving}>
          {saving
            ? <><span className="material-symbols-outlined spin" style={{ fontSize: 18 }}>progress_activity</span> Saving...</>
            : <><span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span> Save Expense</>}
        </button>
      </div>

      {/* Member Selection Bottom Sheet */}
      <div className={`overlay ${isSheetOpen ? 'active' : ''}`} onClick={() => setIsSheetOpen(false)}></div>
      <div className={`bottom-sheet ${isSheetOpen ? 'active' : ''}`}>
        <div className="sheet-handle"></div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, textAlign: 'center' }}>Who is splitting this?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>
          {groupMembers.map(m => {
            const isSel = splitMembers.includes(m.id);
            return (
              <div key={m.id} className="card member-toggle" onClick={() => toggleSplitMember(m.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, cursor: 'pointer', borderColor: isSel ? 'var(--border-accent)' : 'var(--border)' }}>
                <Avatar member={m} sizeClass="avatar-sm" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{m.id === store.user.id ? 'You' : m.name}</span>
                <span className="material-symbols-outlined" style={{ color: isSel ? 'var(--accent)' : 'var(--border)', fontVariationSettings: isSel ? "'FILL' 1" : "'FILL' 0" }}>
                  {isSel ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn btn-primary ripple" onClick={() => setIsSheetOpen(false)} style={{ marginTop: 20, width: '100%' }}>Done</button>
      </div>
    </>
  );
}
