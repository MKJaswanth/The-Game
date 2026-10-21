import React from 'react';

function getInitials(name = '') {
  if (!name) return '??';
  const clean = name.trim();
  if (clean.length <= 2) return clean.toUpperCase();
  const parts = clean.split(/[\s_-]+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// Deterministic flat tone per nickname — muted, same saturation family.
const TONES = [
  { bg: '#2d3846', fg: '#c4d2e0' }, // steel
  { bg: '#3b3421', fg: '#dcc98a' }, // brass
  { bg: '#2c3d35', fg: '#a5cdb6' }, // moss
  { bg: '#43302d', fg: '#d9a8a1' }, // clay
  { bg: '#31353d', fg: '#c0c6d1' }, // slate
  { bg: '#39322f', fg: '#d1b49c' }, // umber
];

function getTone(name = '') {
  if (!name) return TONES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TONES[Math.abs(hash) % TONES.length];
}

export default function Avatar({
  nickname = '',
  size = 'md',
  className = '',
  ...rest
}) {
  const initials = getInitials(nickname);
  const sizeClass = `avatar-${size}`;
  const tone = getTone(nickname);

  return (
    <div
      className={`avatar ${sizeClass} ${className}`.trim()}
      style={{ background: tone.bg, color: tone.fg }}
      title={nickname || 'Player'}
      aria-label={`Avatar for ${nickname || 'Player'}`}
      {...rest}
    >
      <span>{initials}</span>
    </div>
  );
}
export { Avatar };
