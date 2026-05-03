/* ═══════════════════════════════════════════════════════════════
   HisabX — Avatar Component (React)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { getAvatarColor, getInitials } from '../utils.js';
import { avatarPalettes } from '../components/animated-avatar.js';

export function Avatar({ member, sizeClass = '' }) {
  const cls = sizeClass ? `avatar ${sizeClass}` : 'avatar';

  if (member.avatarPref) {
    if (member.avatarPref.type === 'custom' && member.avatarPref.image) {
      return <img src={member.avatarPref.image} className={cls} alt={member.name} style={{ objectFit: 'cover' }} />;
    }
    if (member.avatarPref.type === 'animated') {
      return <StaticAnimatedAvatar paletteIdx={member.avatarPref.paletteIdx} sizeClass={sizeClass} />;
    }
  }

  const color = getAvatarColor(member.name);
  const initials = getInitials(member.name);
  return <div className={`${cls} avatar-initial`} style={{ background: color }}>{initials}</div>;
}

function StaticAnimatedAvatar({ paletteIdx, sizeClass }) {
  const palette = avatarPalettes[paletteIdx] || avatarPalettes[0];
  const cls = sizeClass ? `avatar ${sizeClass}` : 'avatar';
  return (
    <div className={cls} style={{
      background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]}, ${palette[2]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)`,
        pointerEvents: 'none'
      }} />
    </div>
  );
}

export function AvatarStack({ members, max = 3 }) {
  const visible = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="avatar-stack">
      {visible.map(m => <Avatar key={m.id} member={m} sizeClass="avatar-sm" />)}
      {extra > 0 && (
        <div className="avatar avatar-sm avatar-initial" style={{
          background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
          fontSize: 10, fontWeight: 600, borderColor: 'var(--bg-card)'
        }}>+{extra}</div>
      )}
    </div>
  );
}
