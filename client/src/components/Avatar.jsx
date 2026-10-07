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

// Generate consistent gradient for nicknames
function getGradient(name = '') {
  const gradients = [
    'linear-gradient(135deg, #7c3aed, #06b6d4)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #3b82f6, #10b981)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    'linear-gradient(135deg, #10b981, #06b6d4)'
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export default function Avatar({
  nickname = '',
  size = 'md',
  className = '',
  ...rest
}) {
  const initials = getInitials(nickname);
  const sizeClass = `avatar-${size}`;
  const background = getGradient(nickname);

  return (
    <div
      className={`avatar ${sizeClass} ${className}`.trim()}
      style={{ background }}
      title={nickname || 'Player'}
      aria-label={`Avatar for ${nickname || 'Player'}`}
      {...rest}
    >
      <span>{initials}</span>
    </div>
  );
}
export { Avatar };
