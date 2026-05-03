/* HisabX — Create Group Screen (React) */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store.js';
import { DetailHeader } from '../components/HeaderR.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { useToast } from '../context/ToastContext.jsx';

const groupIcons = [
  { id: 'flight_takeoff', label: 'Trip' }, { id: 'home', label: 'Home' },
  { id: 'restaurant', label: 'Food' }, { id: 'celebration', label: 'Party' },
  { id: 'work', label: 'Work' }, { id: 'shopping_bag', label: 'Shop' },
  { id: 'school', label: 'Study' }, { id: 'favorite', label: 'Other' }
];

export default function CreateGroupScreen() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('flight_takeoff');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [creating, setCreating] = useState(false);
  const existingMembers = store.members.filter(m => m.id !== store.user.id);

  function toggleMember(id) {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }
  async function addNewMember() {
    const n = newMemberName.trim();
    if (!n) return;
    const member = await store.addMember(n);
    setSelectedMembers(prev => [...prev, member.id]);
    setNewMemberName('');
  }
  async function handleCreate() {
    if (!name.trim()) { showToast('Please enter a group name', 'error'); return; }
    if (selectedMembers.length === 0) { showToast('Add at least one member', 'error'); return; }
    setCreating(true);
    const group = await store.addGroup(name.trim(), icon, selectedMembers);
    showToast('Group created!', 'success');
    navigate(`/group/${group.id}`);
  }

  return (
    <>
      <DetailHeader title="New Group" />
      <div className="page-content">
        <section>
          <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 'var(--gutter)' }}>Group Name</h2>
          <div className="input-wrapper">
            <span className="material-symbols-outlined">group</span>
            <input type="text" className="input-field" placeholder="e.g., Goa Trip 2026" value={name} onChange={e => setName(e.target.value)} maxLength={30} />
          </div>
        </section>
        <section style={{ marginTop: 'var(--section-gap)' }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 'var(--gutter)' }}>Icon</h2>
          <div className="chips-scroll">
            {groupIcons.map(ic => (
              <button key={ic.id} className={`chip ${icon === ic.id ? 'chip-active' : 'chip-default'}`} onClick={() => setIcon(ic.id)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ic.id}</span>
                <span>{ic.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section style={{ marginTop: 'var(--section-gap)' }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 'var(--gutter)' }}>Add Members</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {existingMembers.map(m => {
              const sel = selectedMembers.includes(m.id);
              return (
                <div key={m.id} className={`card member-select-item ${sel ? 'selected' : ''}`} onClick={() => toggleMember(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer', border: `1px solid ${sel ? 'var(--border-accent)' : 'var(--border)'}` }}>
                  <Avatar member={m} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{m.name}</span>
                  <span className="material-symbols-outlined" style={{ color: sel ? 'var(--accent)' : 'var(--text-disabled)', fontVariationSettings: sel ? "'FILL' 1" : "'FILL' 0", fontSize: 22 }}>
                    {sel ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-wrapper" style={{ flex: 1 }}>
              <span className="material-symbols-outlined">person_add</span>
              <input type="text" className="input-field" placeholder="Add new member" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewMember()} />
            </div>
            <button className="btn btn-secondary" onClick={addNewMember} style={{ height: 'auto', padding: '0 20px' }}>Add</button>
          </div>
        </section>
        <div style={{ height: 100 }}></div>
      </div>
      <div className="fixed-bottom-action">
        <button className="btn btn-primary ripple" onClick={handleCreate} disabled={creating}>
          {creating
            ? <><span className="material-symbols-outlined spin" style={{ fontSize: 18 }}>progress_activity</span> Creating...</>
            : <><span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>group_add</span> Create Group</>}
        </button>
      </div>
    </>
  );
}
