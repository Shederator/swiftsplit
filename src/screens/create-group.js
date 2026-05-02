/* HisabX — Create Group Screen (Dark Theme) */

import { store } from '../store.js';
import { renderDetailHeader, bindBackButton } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { renderAvatar } from '../utils.js';
import { navigate } from '../router.js';

const groupIcons = [
  { id: 'flight_takeoff', label: 'Trip' },
  { id: 'home', label: 'Home' },
  { id: 'restaurant', label: 'Food' },
  { id: 'celebration', label: 'Party' },
  { id: 'work', label: 'Work' },
  { id: 'shopping_bag', label: 'Shop' },
  { id: 'school', label: 'Study' },
  { id: 'favorite', label: 'Other' }
];

export default function createGroupScreen(container) {
  let state = { name: '', icon: 'flight_takeoff', selectedMembers: [] };
  const existingMembers = store.members.filter(m => m.id !== store.user.id);

  function render() {
    container.innerHTML = `
      ${renderDetailHeader('New Group')}
      <div class="page-content">
        <!-- Group Name -->
        <section>
          <h2 style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--gutter)">Group Name</h2>
          <div class="input-wrapper">
            <span class="material-symbols-outlined">group</span>
            <input type="text" id="group-name" class="input-field" placeholder="e.g., Goa Trip 2026" value="${state.name}" maxlength="30">
          </div>
        </section>

        <!-- Icon Picker -->
        <section style="margin-top:var(--section-gap)">
          <h2 style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--gutter)">Icon</h2>
          <div class="chips-scroll">
            ${groupIcons.map(ic => `
              <button class="chip ${state.icon === ic.id ? 'chip-active' : 'chip-default'}" data-icon="${ic.id}">
                <span class="material-symbols-outlined" style="font-size:18px">${ic.id}</span>
                <span>${ic.label}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- Members -->
        <section style="margin-top:var(--section-gap)">
          <h2 style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--gutter)">Add Members</h2>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${existingMembers.map(m => {
              const selected = state.selectedMembers.includes(m.id);
              return `<div class="card member-select-item ${selected ? 'selected' : ''}" data-member="${m.id}" style="display:flex;align-items:center;gap:14px;padding:12px 16px;cursor:pointer;border:1px solid ${selected ? 'var(--border-accent)' : 'var(--border)'}">
                ${renderAvatar(m)}
                <span style="font-size:14px;font-weight:600;color:var(--text-primary);flex:1">${m.name}</span>
                <span class="material-symbols-outlined" style="color:${selected ? 'var(--accent)' : 'var(--text-disabled)'};font-variation-settings:'FILL' ${selected ? '1' : '0'};font-size:22px">${selected ? 'check_circle' : 'radio_button_unchecked'}</span>
              </div>`;
            }).join('')}
          </div>
        </section>

        <!-- New Member -->
        <section style="margin-top:16px">
          <div style="display:flex;gap:12px">
            <div class="input-wrapper" style="flex:1">
              <span class="material-symbols-outlined">person_add</span>
              <input type="text" id="new-member-name" class="input-field" placeholder="Add new member">
            </div>
            <button class="btn btn-secondary" id="add-member-btn" style="height:auto;padding:0 20px">Add</button>
          </div>
        </section>

        <div style="height:100px"></div>
      </div>

      <div class="fixed-bottom-action">
        <button class="btn btn-primary ripple" id="create-group-btn">
          <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">group_add</span>
          Create Group
        </button>
      </div>`;

    bindBackButton(container);
    bindEvents();
  }

  function bindEvents() {
    const nameInput = container.querySelector('#group-name');
    if (nameInput) nameInput.addEventListener('input', e => { state.name = e.target.value; });

    container.querySelectorAll('[data-icon]').forEach(btn => {
      btn.addEventListener('click', () => { state.icon = btn.dataset.icon; render(); });
    });

    container.querySelectorAll('[data-member]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.member;
        if (state.selectedMembers.includes(id)) state.selectedMembers = state.selectedMembers.filter(m => m !== id);
        else state.selectedMembers.push(id);
        render();
      });
    });

    const addMemberBtn = container.querySelector('#add-member-btn');
    const newMemberInput = container.querySelector('#new-member-name');
    if (addMemberBtn && newMemberInput) {
      addMemberBtn.addEventListener('click', async () => {
        const name = newMemberInput.value.trim();
        if (!name) return;
        addMemberBtn.disabled = true;
        const member = await store.addMember(name);
        state.selectedMembers.push(member.id);
        render();
      });
    }

    const createBtn = container.querySelector('#create-group-btn');
    if (createBtn) createBtn.addEventListener('click', async () => {
      if (!state.name.trim()) { showToast('Please enter a group name', 'error'); return; }
      if (state.selectedMembers.length === 0) { showToast('Add at least one member', 'error'); return; }
      createBtn.disabled = true;
      createBtn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size:18px">progress_activity</span> Creating...';
      const group = await store.addGroup(state.name.trim(), state.icon, state.selectedMembers);
      showToast('Group created!', 'success');
      navigate(`/group/${group.id}`);
    });
  }

  render();
}
