/* ═══════════════════════════════════════════════════════════════
   HisabX — Add Expense Screen (Dark Theme)
   ═══════════════════════════════════════════════════════════════ */

import { store } from '../store.js';
import { renderDetailHeader, bindBackButton } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, renderAvatar, getCategoryIcon } from '../utils.js';

const categories = [
  { id: 'food', icon: 'restaurant', label: 'Food' },
  { id: 'travel', icon: 'directions_car', label: 'Travel' },
  { id: 'rent', icon: 'home', label: 'Rent' },
  { id: 'shopping', icon: 'shopping_bag', label: 'Shopping' },
  { id: 'entertainment', icon: 'movie', label: 'Fun' },
  { id: 'other', icon: 'receipt_long', label: 'Other' }
];

export default function addExpenseScreen(container, params) {
  const preselectedGroupId = params.groupId || '';
  const groups = store.groups;
  const selectedGroup = preselectedGroupId ? store.getGroup(preselectedGroupId) : groups[0];
  
  let state = {
    amount: '',
    description: '',
    category: 'food',
    paidBy: store.user.id,
    groupId: selectedGroup?.id || '',
    splitMethod: 'equal', // 'equal', 'exact', 'weight'
    splitMembers: selectedGroup ? [...selectedGroup.members] : [],
    splitData: {}, // { memberId: value }
    isSheetOpen: false
  };

  // Initialize default splitData percentages if empty
  function initSplitData() {
    if (state.splitMethod === 'weight' && Object.keys(state.splitData).length === 0 && state.splitMembers.length > 0) {
      state.splitMembers.forEach((id) => {
        state.splitData[id] = 1;
      });
    }
  }

  function render() {
    initSplitData();
    const group = store.getGroup(state.groupId);
    const groupMembers = group ? store.getGroupMembers(group.id) : [];
    const payer = store.getMember(state.paidBy);
    const splitCount = state.splitMembers.length || 1;
    const amountVal = Number(state.amount) || 0;
    const perPerson = amountVal ? Math.round(amountVal / splitCount) : 0;

    let splitUIDetails = '';
    
    if (state.splitMethod === 'exact') {
      const currentTotal = state.splitMembers.reduce((sum, id) => sum + Number(state.splitData[id] || 0), 0);
      const remaining = amountVal - currentTotal;
      splitUIDetails = `
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text-tertiary)">Total: ₹${amountVal}</span>
            <span style="font-size:12px;color:${remaining === 0 ? 'var(--green)' : 'var(--red)'}">${remaining === 0 ? 'Matches total' : `Remaining: ₹${remaining}`}</span>
          </div>
          ${state.splitMembers.map(mId => {
            const m = store.getMember(mId);
            return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div style="display:flex;align-items:center;gap:8px">
                ${renderAvatar(m, 'avatar-sm')}
                <span style="font-size:14px;color:var(--text-primary)">${m.id === store.user.id ? 'You' : m.name}</span>
              </div>
              <div class="input-wrapper" style="width:100px">
                <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);font-size:14px">₹</span>
                <input type="number" class="input-field exact-input" data-id="${m.id}" value="${state.splitData[m.id] || ''}" style="padding:8px 8px 8px 24px;font-size:14px;text-align:right" placeholder="0">
              </div>
            </div>`;
          }).join('')}
        </div>
      `;
    } else if (state.splitMethod === 'weight') {
      const totalWeight = state.splitMembers.reduce((sum, id) => sum + Number(state.splitData[id] || 0), 0);
      const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#e84393', '#00cec9', '#d63031'];
      let barHtml = '';
      if (totalWeight > 0) {
        barHtml = `<div style="display:flex; width:100%; height:12px; border-radius:6px; overflow:hidden; margin-bottom: 12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05)">`;
        state.splitMembers.forEach((mId, idx) => {
          const val = Number(state.splitData[mId] || 0);
          if (val > 0) {
            const pct = (val / totalWeight) * 100;
            const m = store.getMember(mId);
            const name = mId === store.user.id ? 'You' : m?.name.split(' ')[0];
            barHtml += `
              <div style="width:${pct}%; background:${colors[idx % colors.length]}; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative;" title="${val} shares">
                ${pct > 15 ? `<span style="font-size:9px; font-weight:700; color:rgba(255,255,255,0.9); mix-blend-mode:overlay; white-space:nowrap; pointer-events:none;">${name}</span>` : ''}
              </div>`;
          }
        });
        barHtml += `</div>`;
      }
      
      splitUIDetails = `
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          ${barHtml}
          ${state.splitMembers.map((mId, idx) => {
            const m = store.getMember(mId);
            const val = Number(state.splitData[mId] || 0);
            const pct = totalWeight > 0 ? (val / totalWeight) * 100 : 0;
            const computedAmt = totalWeight > 0 ? amountVal * (val / totalWeight) : 0;
            const color = colors[idx % colors.length];
            return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:var(--radius-md);border-left:4px solid ${color}">
              <div style="display:flex;align-items:center;gap:12px">
                ${renderAvatar(m, 'avatar-sm')}
                <div style="display:flex;flex-direction:column;gap:2px">
                  <span style="font-size:14px;color:var(--text-primary);font-weight:600">${m.id === store.user.id ? 'You' : m.name}</span>
                  <span style="font-size:12px;color:var(--text-tertiary)">${pct.toFixed(0)}% • ₹${computedAmt.toFixed(0)}</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;background:rgba(0,0,0,0.2);border-radius:var(--radius-full);padding:4px;border:1px solid rgba(255,255,255,0.05)">
                <button class="weight-btn ripple" data-action="minus" data-id="${m.id}" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);color:var(--text-primary);font-size:18px;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;">-</button>
                <span style="font-size:16px;font-weight:700;min-width:24px;text-align:center;color:var(--text-primary)">${val}</span>
                <button class="weight-btn ripple" data-action="plus" data-id="${m.id}" style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:white;font-size:18px;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;">+</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      ${renderDetailHeader('Add Expense')}
      <div class="page-content">
        <!-- Amount Input -->
        <section class="card" style="text-align:center;padding:24px 20px 20px;position:relative;overflow:hidden;border:1px solid rgba(108,92,231,0.2);box-shadow:0 8px 32px rgba(0,0,0,0.15)">
          <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:180px;height:180px;background:var(--accent);filter:blur(80px);opacity:0.12;pointer-events:none"></div>
          <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;position:relative;z-index:1;opacity:0.9">Enter Amount</p>
          <div class="amount-input-wrap" style="position:relative;z-index:1;margin-bottom:20px;display:flex;align-items:center;justify-content:center;gap:4px">
            <span style="font-size:32px;font-weight:700;color:var(--accent);letter-spacing:-0.03em">₹</span>
            <input type="number" id="expense-amount" class="amount-input display-currency" placeholder="0" value="${state.amount}" inputmode="numeric" autofocus style="font-size:48px;font-weight:700;width:140px;text-shadow:0 2px 8px rgba(0,0,0,0.2);caret-color:var(--accent);padding:0;background:transparent;border:none">
          </div>
          <!-- Description -->
          <div class="input-wrapper" style="position:relative;z-index:1">
            <span class="material-symbols-outlined" style="color:var(--accent);font-size:18px">edit_note</span>
            <input type="text" id="expense-desc" class="input-field" placeholder="What was this for?" value="${state.description}" style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);color:var(--text-primary);padding:12px 14px 12px 42px;font-size:14px;border-radius:var(--radius-sm)">
          </div>
        </section>

        <!-- Category Chips -->
        <section style="margin-top:var(--section-gap)">
          <h2 style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--gutter)">Category</h2>
          <div class="chips-scroll">
            ${categories.map(cat => `
              <button class="chip ${state.category === cat.id ? 'chip-active' : 'chip-default'}" data-cat="${cat.id}">
                <span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' ${state.category === cat.id ? '1' : '0'}">${cat.icon}</span>
                <span>${cat.label}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- Split Details -->
        <section style="margin-top:var(--section-gap)">
          <div class="card" style="padding:0;overflow:hidden">
            <div class="split-row-item" style="border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:var(--gutter)">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-tertiary)">account_balance_wallet</span>
                <span style="font-size:14px;color:var(--text-primary)">Paid by</span>
              </div>
              <div class="payer-badge">
                ${renderAvatar(payer, 'avatar-sm')}
                <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${payer?.id === store.user.id ? 'You' : payer?.name}</span>
              </div>
            </div>
            <div class="split-row-item ripple" id="open-members-btn" style="cursor:pointer">
              <div style="display:flex;align-items:center;gap:var(--gutter)">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-tertiary)">group</span>
                <span style="font-size:14px;color:var(--text-primary)">Split with</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;font-weight:500;color:var(--accent)">${splitCount === groupMembers.length ? 'Everyone' : `${splitCount} people`}</span>
                <span class="material-symbols-outlined" style="font-size:16px;color:var(--text-tertiary)">chevron_right</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Split Method -->
        <section style="margin-top:var(--section-gap)">
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h2 style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary)">Split Method</h2>
            </div>
            <div class="split-toggle">
              <div class="split-toggle-track">
                <button class="split-toggle-btn ${state.splitMethod === 'equal' ? 'active' : ''}" data-method="equal">Equally</button>
                <button class="split-toggle-btn ${state.splitMethod === 'exact' ? 'active' : ''}" data-method="exact">Exact</button>
                <button class="split-toggle-btn ${state.splitMethod === 'weight' ? 'active' : ''}" data-method="weight">Weight</button>
              </div>
            </div>
            
            ${state.splitMethod === 'equal' ? `
            <div style="display:flex;justify-content:space-between;padding:12px 2px 0;margin-top:8px;border-top:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-secondary)">${splitCount} people</span>
              <span style="font-size:13px;font-weight:600;color:var(--text-primary)">₹${perPerson.toLocaleString('en-IN')} / person</span>
            </div>` : splitUIDetails}
          </div>
        </section>

        <!-- Date & Group -->
        <section style="margin-top:var(--section-gap);display:grid;grid-template-columns:1fr 1fr;gap:var(--gutter)">
          <div class="card" style="padding:14px">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-tertiary);margin-bottom:8px;display:block">calendar_today</span>
            <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px">Date</span>
            <span style="font-size:14px;font-weight:600;color:var(--text-primary)">Today</span>
          </div>
          <div class="card" style="padding:14px">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-tertiary);margin-bottom:8px;display:block">${group?.icon || 'group'}</span>
            <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px">Group</span>
            <select id="expense-group" style="font-size:14px;font-weight:600;background:transparent;color:var(--text-primary);width:100%;cursor:pointer;border:none;outline:none;padding:0">
              ${groups.map(g => `<option value="${g.id}" ${g.id === state.groupId ? 'selected' : ''} style="background:var(--bg-card);color:var(--text-primary)">${g.name}</option>`).join('')}
            </select>
          </div>
        </section>

        <div style="height:100px"></div>
      </div>

      <!-- Save Button -->
      <div class="fixed-bottom-action">
        <button class="btn btn-primary ripple" id="save-expense">
          <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1">check_circle</span>
          Save Expense
        </button>
      </div>
      
      <!-- Member Selection Bottom Sheet -->
      <div class="overlay ${state.isSheetOpen ? 'active' : ''}" id="sheet-overlay"></div>
      <div class="bottom-sheet ${state.isSheetOpen ? 'active' : ''}" id="members-sheet">
        <div class="sheet-handle"></div>
        <h3 style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:16px;text-align:center">Who is splitting this?</h3>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto;padding-right:4px">
          ${groupMembers.map(m => {
            const isSelected = state.splitMembers.includes(m.id);
            return `
            <div class="card member-toggle" data-id="${m.id}" style="display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer;border-color:${isSelected ? 'var(--border-accent)' : 'var(--border)'}">
              ${renderAvatar(m, 'avatar-sm')}
              <span style="flex:1;font-size:14px;font-weight:500;color:var(--text-primary)">${m.id === store.user.id ? 'You' : m.name}</span>
              <span class="material-symbols-outlined" style="color:${isSelected ? 'var(--accent)' : 'var(--border)'};font-variation-settings:'FILL' ${isSelected ? '1' : '0'}">
                ${isSelected ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-primary ripple" id="close-sheet-btn" style="margin-top:20px;width:100%">Done</button>
      </div>
    `;

    bindBackButton(container);
    bindEvents();
  }

  function bindEvents() {
    const amountInput = container.querySelector('#expense-amount');
    const descInput = container.querySelector('#expense-desc');
    const groupSelect = container.querySelector('#expense-group');

    // Basic inputs
    if (amountInput) {
      amountInput.addEventListener('input', e => { 
        state.amount = e.target.value; 
        if(state.splitMethod !== 'equal') render(); // re-render to update dynamic values
      });
      amountInput.addEventListener('blur', render);
    }
    if (descInput) descInput.addEventListener('input', e => { state.description = e.target.value; });
    if (groupSelect) groupSelect.addEventListener('change', e => {
      state.groupId = e.target.value;
      const g = store.getGroup(state.groupId);
      if (g) {
        state.splitMembers = [...g.members];
        state.splitData = {};
      }
      render();
    });

    // Category chips
    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => { state.category = btn.dataset.cat; render(); });
    });

    // Split method toggle
    container.querySelectorAll('[data-method]').forEach(btn => {
      btn.addEventListener('click', () => { 
        state.splitMethod = btn.dataset.method; 
        if (state.splitMethod === 'weight') state.splitData = {}; // reset so it auto-initializes evenly
        render(); 
      });
    });

    // Exact amount inputs
    container.querySelectorAll('.exact-input').forEach(input => {
      input.addEventListener('input', e => {
        state.splitData[e.target.dataset.id] = e.target.value;
      });
      input.addEventListener('blur', render); // update total warning
    });

    // Weight buttons
    container.querySelectorAll('.weight-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        let current = Number(state.splitData[id] || 0);
        if (action === 'plus') current++;
        if (action === 'minus' && current > 0) current--;
        state.splitData[id] = current;
        render(); // Full re-render to update the visual bar and amounts easily
      });
    });

    // Member Selection Sheet
    const openBtn = container.querySelector('#open-members-btn');
    const overlay = container.querySelector('#sheet-overlay');
    const closeBtn = container.querySelector('#close-sheet-btn');

    if (openBtn) openBtn.addEventListener('click', () => { state.isSheetOpen = true; render(); });
    if (overlay) overlay.addEventListener('click', () => { state.isSheetOpen = false; render(); });
    if (closeBtn) closeBtn.addEventListener('click', () => { state.isSheetOpen = false; render(); });

    container.querySelectorAll('.member-toggle').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (state.splitMembers.includes(id)) {
          if(state.splitMembers.length === 1) { showToast('Must split with at least 1 person', 'error'); return; }
          state.splitMembers = state.splitMembers.filter(m => m !== id);
        } else {
          state.splitMembers.push(id);
        }
        // Clean up splitData for removed members
        if(state.splitData[id] && !state.splitMembers.includes(id)) delete state.splitData[id];
        if (state.splitMethod === 'weight') state.splitData = {}; // reset weights if members change
        render();
      });
    });

    // Save
    const saveBtn = container.querySelector('#save-expense');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const amountVal = Number(state.amount);
      if (!amountVal || amountVal <= 0) { showToast('Please enter an amount', 'error'); return; }
      if (!state.description) { showToast('Please add a description', 'error'); return; }
      
      // Validation
      if (state.splitMethod === 'exact') {
        const sum = state.splitMembers.reduce((s, id) => s + Number(state.splitData[id] || 0), 0);
        if (sum !== amountVal) { showToast(`Exact amounts must sum to ₹${amountVal}`, 'error'); return; }
      } else if (state.splitMethod === 'weight') {
        const sum = state.splitMembers.reduce((s, id) => s + Number(state.splitData[id] || 0), 0);
        if (sum === 0) { showToast(`Total weight must be greater than 0`, 'error'); return; }
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:18px">progress_activity</span> Saving...';
      
      await store.addExpense(state.groupId, amountVal, state.description, state.category, state.paidBy, state.splitMembers, state.splitMethod, state.splitData);
      showToast('Expense added!', 'success');
      window.history.back();
    });
  }

  render();
}
