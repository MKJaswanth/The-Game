import React from 'react';

const GAME_META = {
  snake:        { label: 'Solo Arcade',     num: '01' },
  trivia:       { label: 'Multiplayer Quiz', num: '02' },
  wordscramble: { label: 'Speed Word Battle', num: '03' },
  tictactoe:    { label: '1v1 Tactics',      num: '04' },
  uno:          { label: 'Card Battle',      num: '05' },
  flappy:       { label: 'Neon Bird Race',   num: '06' },
  chess:        { label: '1v1 Strategy',     num: '07' },
  emoji:        { label: 'Emoji Party',      num: '08' },
};
const DEFAULT_META = { label: 'Arcade Game', num: '—' };

export default function GameCard({ game, onSelect }) {
  const { id, title, description, playerCount, isAvailable = true } = game;
  const meta = GAME_META[id] || DEFAULT_META;

  return (
    <article
      className={`gc ${isAvailable ? 'gc--on' : 'gc--off'}`}
      onClick={() => isAvailable && onSelect?.(game)}
      role={isAvailable ? 'button' : undefined}
      tabIndex={isAvailable ? 0 : -1}
      onKeyDown={(e) => { if (isAvailable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect?.(game); } }}
      aria-label={`${title}${isAvailable ? '' : ' — coming soon'}`}
    >
      <span className="gc-num" aria-hidden="true">{meta.num}</span>

      <div className="gc-head">
        <span className="gc-label">{isAvailable ? meta.label : 'Coming soon'}</span>
      </div>

      <h3 className="gc-title">{title}</h3>
      <p className="gc-desc">{description}</p>

      <div className="gc-footer">
        <span className="gc-players">{playerCount}</span>
        {isAvailable ? (
          <span className="gc-cta">
            Play <span className="gc-cta-arrow">→</span>
          </span>
        ) : (
          <span className="gc-phase">In development</span>
        )}
      </div>
    </article>
  );
}

/* Inject once */
if (typeof document !== 'undefined' && !document.getElementById('gc-styles')) {
  const s = document.createElement('style');
  s.id = 'gc-styles';
  s.textContent = `
    .gc {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: var(--s6);
      padding-top: var(--s5);
      display: flex;
      flex-direction: column;
      min-height: 232px;
      overflow: hidden;
      transition: border-color 200ms ease, transform 200ms ease, background 200ms ease;
    }
    .gc--on { cursor: pointer; }
    .gc--off {
      opacity: 0.55;
      background: transparent;
    }

    .gc--on:hover {
      border-color: var(--border-3);
      background: var(--surface-2);
      transform: translateY(-2px);
    }
    .gc--on:focus-visible {
      outline: 1px solid var(--accent);
      outline-offset: 3px;
    }

    /* Ghost numeral, top-right */
    .gc-num {
      position: absolute;
      top: 6px;
      right: 12px;
      font-family: var(--mono);
      font-size: 2.1rem;
      font-weight: 700;
      color: var(--surface-3);
      letter-spacing: -0.04em;
      user-select: none;
      transition: color 240ms ease;
    }
    .gc--on:hover .gc-num { color: var(--border-3); }

    .gc-head {
      display: flex;
      align-items: center;
      margin-bottom: var(--s5);
    }

    .gc-label {
      font-family: var(--mono);
      font-size: 0.66rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--text-3);
      padding-bottom: 1px;
      border-bottom: 1px solid var(--border-3);
    }

    .gc-title {
      font-size: var(--t-2xl);
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin-bottom: var(--s2);
    }

    .gc-desc {
      font-size: var(--t-sm);
      color: var(--text-2);
      line-height: 1.55;
      flex: 1;
    }

    .gc-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: var(--s5);
      padding-top: var(--s4);
      border-top: 1px solid var(--border);
    }

    .gc-players {
      font-family: var(--mono);
      font-size: 0.68rem;
      color: var(--text-3);
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .gc-cta {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: var(--mono);
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .gc-cta-arrow { transition: transform 180ms ease; }
    .gc--on:hover .gc-cta-arrow { transform: translateX(3px); }

    .gc-phase {
      font-family: var(--mono);
      font-size: 0.66rem;
      color: var(--text-3);
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `;
  document.head.appendChild(s);
}
