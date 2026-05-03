/* HisabX — Profile Screen (React) */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { store } from '../store.js';
import { useStore } from '../hooks/useStore.js';
import { HomeHeader } from '../components/HeaderR.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  mountAnimatedAvatar, avatarPalettes, avatarIcons, getDefaultPaletteIdx
} from '../components/animated-avatar.js';

export default function ProfileScreen({ onLogout }) {
  const data = useStore();
  const showToast = useToast();
  const { user } = store;
  const member = store.getMember(user.id);

  const [pref, setPref] = useState(() => {
    const p = member?.avatarPref || { type: 'animated', paletteIdx: getDefaultPaletteIdx(user.name), image: null };
    return { ...p };
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiValue, setUpiValue] = useState(member?.upiId || '');

  const mountRef = useRef(null);
  const glowRef = useRef(null);
  const stopAnimRef = useRef(null);
  const fileInputRef = useRef(null);

  // Mount/update avatar
  useEffect(() => {
    if (!mountRef.current || !glowRef.current) return;
    if (stopAnimRef.current) stopAnimRef.current();
    const el = mountRef.current;
    const glow = glowRef.current;

    if (pref.type === 'custom' && pref.image) {
      el.innerHTML = `<img src="${pref.image}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block">`;
      const palette = avatarPalettes[pref.paletteIdx || 0];
      glow.style.background = `linear-gradient(135deg,${palette[0]},${palette[1]},${palette[2]})`;
      stopAnimRef.current = null;
    } else {
      const palette = avatarPalettes[pref.paletteIdx];
      glow.style.background = `linear-gradient(135deg,${palette[0]},${palette[1]},${palette[2]})`;
      stopAnimRef.current = mountAnimatedAvatar(el, user.name, pref.paletteIdx, 96);
    }
    return () => { if (stopAnimRef.current) stopAnimRef.current(); };
  }, [pref.type, pref.paletteIdx, pref.image, user.name]);

  async function selectPalette(idx) {
    const newPref = { type: 'animated', paletteIdx: idx, image: null };
    setPref(newPref);
    try { await store.updateUserAvatar(newPref); showToast('Avatar updated!', 'success'); }
    catch { showToast('Failed to save avatar', 'error'); }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const cx = c.getContext('2d');
        const s = Math.min(img.width, img.height);
        cx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        c.toBlob(async (blob) => {
          try {
            const url = await store.uploadAvatarImage(new File([blob], file.name, { type: 'image/jpeg' }));
            const newPref = { ...pref, type: 'custom', image: url };
            setPref(newPref);
            await store.updateUserAvatar(newPref);
            showToast('Photo uploaded!', 'success');
          } catch (err) { showToast(err.message, 'error'); }
        }, 'image/jpeg', 0.85);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function removePhoto() {
    const newPref = { type: 'animated', paletteIdx: pref.paletteIdx || getDefaultPaletteIdx(user.name), image: null };
    setPref(newPref);
    try { await store.updateUserAvatar(newPref); showToast('Photo removed', 'success'); }
    catch { showToast('Failed to remove photo', 'error'); }
  }

  async function saveUpi() {
    const v = upiValue.trim();
    if (v !== (member?.upiId || '')) {
      try { await store.updateUpiId(v); showToast('UPI ID updated!', 'success'); }
      catch { showToast('Failed to update UPI ID', 'error'); }
    }
    setUpiModalOpen(false);
  }

  const menuItems = [
    { id: 'edit-upi', icon: 'account_balance', label: 'UPI ID', value: member?.upiId || 'Not set', onClick: () => { setUpiValue(member?.upiId || ''); setUpiModalOpen(true); } },
    { icon: 'currency_rupee', label: 'Currency', value: 'INR (₹)' },
    { icon: 'notifications', label: 'Notifications', value: 'On' },
    { icon: 'palette', label: 'Theme', value: 'Dark Crypto' },
    { icon: 'info', label: 'About HisabX', value: 'v1.0.0' }
  ];

  return (
    <>
      <HomeHeader />
      <div className="page-content stagger">
        {/* Profile Card */}
        <section style={{ textAlign: 'center', padding: 'var(--section-gap) 0' }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <div ref={glowRef} className="avatar-glow-ring"></div>
            <div ref={mountRef} className="avatar-mount"></div>
            <div className="avatar-edit-btn" onClick={() => setSheetOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
            </div>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--stack-gap)' }}>{user.name}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Member since April 2026</p>
        </section>

        {/* Stats */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--gutter)', marginBottom: 'var(--section-gap)' }}>
          {[{ val: store.groups.length, label: 'Groups' }, { val: store.expenses.length, label: 'Expenses' }, { val: store.settlements.length, label: 'Settled' }].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{s.val}</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginTop: 4 }}>{s.label}</span>
            </div>
          ))}
        </section>

        {/* Menu */}
        <section>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {menuItems.map((item, i) => (
              <div key={item.label} onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none', cursor: item.onClick ? 'pointer' : 'default' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)' }}>{item.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{item.value}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--text-disabled)' }}>chevron_right</span>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section style={{ marginTop: 'var(--section-gap)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-outline" style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(255,107,107,0.3)' }}
            onClick={async () => { await store.resetData(); showToast('Data reset!', 'success'); }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>restart_alt</span> Reset All Data
          </button>
          <button className="btn btn-outline" style={{ width: '100%', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
            onClick={() => { store.logout(); onLogout(); }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span> Logout
          </button>
        </section>
        <div style={{ height: 100 }}></div>
      </div>

      {/* Avatar Editor Sheet */}
      <div className={`overlay ${sheetOpen ? 'active' : ''}`} onClick={() => setSheetOpen(false)}></div>
      <div className={`bottom-sheet ${sheetOpen ? 'active' : ''}`}>
        <div className="sheet-handle"></div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, textAlign: 'center' }}>Choose Avatar Style</h3>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>Animated Gradients</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
          {avatarPalettes.map((p, i) => (
            <div key={i} className={`palette-opt${pref.type === 'animated' && pref.paletteIdx === i ? ' active' : ''}`} onClick={() => selectPalette(i)}>
              <div className="palette-swatch" style={{ background: `linear-gradient(135deg,${p[0]},${p[1]},${p[2]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 24 }}>{avatarIcons[i]}</span>
              </div>
              {pref.type === 'animated' && pref.paletteIdx === i && (
                <div className="palette-check-wrap" style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                  <span className="material-symbols-outlined palette-check" style={{ fontSize: 14, color: 'white', position: 'static', transform: 'none' }}>check</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }}></div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>Custom Photo</p>
        <button className="btn btn-outline" style={{ width: '100%', gap: 8 }} onClick={() => fileInputRef.current?.click()}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_a_photo</span> Upload Photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        {pref.type === 'custom' && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'rgba(255,107,107,0.3)', gap: 6, width: '100%' }} onClick={removePhoto}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span> Remove Photo
            </button>
          </div>
        )}
      </div>

      {/* UPI Edit Modal */}
      {upiModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setUpiModalOpen(false); }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Edit UPI ID</h3>
            <input type="text" value={upiValue} onChange={e => setUpiValue(e.target.value)} placeholder="Enter UPI ID" autoFocus
              style={{ width: '100%', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setUpiModalOpen(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveUpi} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
