import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import Avatar from './Avatar.jsx';
import Badge from './Badge.jsx';

export default function Navbar() {
  const { nickname, onlinePlayers, leaveHub } = usePlayer();

  return (
    <nav className="navbar" style={{
      background: 'rgba(22, 25, 40, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-surface-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: 'var(--space-3) 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '1.5rem' }}>🎮</span>
          <span style={{
            fontWeight: 800,
            fontSize: 'var(--font-size-xl)',
            background: 'linear-gradient(135deg, #ffffff, var(--color-accent-light))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            The Game
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <NavLink
            to="/hub"
            style={({ isActive }) => ({
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              transition: 'color var(--transition-fast)'
            })}
          >
            Game Hub
          </NavLink>
          <NavLink
            to="/leaderboard"
            style={({ isActive }) => ({
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              transition: 'color var(--transition-fast)'
            })}
          >
            Leaderboard
          </NavLink>
        </div>

        {/* User / Nickname / Online Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {nickname ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Avatar nickname={nickname} size="sm" />
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                {nickname}
              </span>
              <Badge variant="accent" style={{ fontSize: '10px', padding: '2px 6px' }}>ONLINE</Badge>
              <button
                type="button"
                onClick={leaveHub}
                title="Switch player / Leave"
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <Link to="/" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 'var(--font-size-xs)' }}>
              Join Hub
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
