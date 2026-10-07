import React from 'react';
import Badge from './Badge.jsx';

export default function GameCard({ game, onSelect }) {
  const {
    id,
    title,
    icon,
    description,
    playerCount,
    category,
    badgeVariant = 'primary',
    isAvailable = true,
    activeRooms = 0
  } = game;

  return (
    <div
      className={`card game-card ${isAvailable ? 'card-hover' : 'game-card-disabled'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isAvailable ? 'pointer' : 'default',
        opacity: isAvailable ? 1 : 0.65,
        border: '1px solid var(--color-surface-border)',
        minHeight: '260px'
      }}
      onClick={() => isAvailable && onSelect && onSelect(game)}
      role={isAvailable ? 'button' : 'region'}
      tabIndex={isAvailable ? 0 : -1}
      onKeyDown={(e) => {
        if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect && onSelect(game);
        }
      }}
    >
      {/* Top Banner & Status */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{
            fontSize: '2.5rem',
            lineHeight: 1,
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.05)'
          }}>
            {icon}
          </div>

          <Badge variant={isAvailable ? badgeVariant : 'warning'}>
            {isAvailable ? category : 'COMING SOON'}
          </Badge>
        </div>

        <h3 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          marginBottom: 'var(--space-2)',
          color: '#ffffff'
        }}>
          {title}
        </h3>

        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 1.5,
          marginBottom: 'var(--space-4)'
        }}>
          {description}
        </p>
      </div>

      {/* Footer Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--color-surface-border)',
        marginTop: 'auto'
      }}>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-dim)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)'
        }}>
          👥 {playerCount}
        </span>

        {isAvailable ? (
          <span className="btn btn-accent" style={{
            padding: '6px 14px',
            fontSize: 'var(--font-size-xs)',
            borderRadius: 'var(--radius-sm)',
            pointerEvents: 'none'
          }}>
            Play →
          </span>
        ) : (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', fontWeight: 600 }}>
            Phase 2
          </span>
        )}
      </div>
    </div>
  );
}
