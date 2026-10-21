import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import Avatar from './Avatar.jsx';

function BoltIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.2 1 3.4 9h3.1l-1 6 5.9-8H8.3l.9-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function GridIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function TrophyIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 2h7v3.2a3.5 3.5 0 0 1-7 0V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.5 2.8H14v1.4a2.2 2.2 0 0 1-2.2 2.2M4.5 2.8H2v1.4a2.2 2.2 0 0 0 2.2 2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 8.7V11M6 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const { nickname, onlinePlayers, leaveHub } = usePlayer();

  return (
    <nav className="nav">
      <div className="nav-inner container">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-mark"><BoltIcon /></span>
          <span className="nav-brand-text">THE GAME</span>
        </Link>

        {nickname && (
          <div className="nav-links">
            <NavLink to="/hub" className={({ isActive }) => isActive ? 'nav-link nav-link--on' : 'nav-link'}>
              <GridIcon /> Hub
            </NavLink>
            <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link nav-link--on' : 'nav-link'}>
              <TrophyIcon /> Leaderboard
            </NavLink>
          </div>
        )}

        <div className="nav-right">
          {nickname ? (
            <div className="nav-player">
              {onlinePlayers.length > 0 && (
                <span className="nav-online">
                  <span className="dot-live" />
                  <span>{onlinePlayers.length} live</span>
                </span>
              )}
              <Link to={`/profile/${encodeURIComponent(nickname)}`} className="nav-chip" title="My Profile">
                <Avatar nickname={nickname} size="sm" />
                <span className="nav-chip-name">{nickname}</span>
              </Link>
              <button type="button" className="nav-leave" onClick={leaveHub} title="Exit hub" aria-label="Exit hub">
                ×
              </button>
            </div>
          ) : (
            <Link to="/" className="btn btn-primary nav-cta">
              Play now
            </Link>
          )}
        </div>
      </div>

      <style>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 56px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
        }

        .nav-inner {
          height: 100%;
          display: flex;
          align-items: center;
          gap: var(--s6);
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-brand-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: var(--accent);
          color: #16130c;
          border-radius: var(--r-sm);
        }

        .nav-brand-text {
          font-family: var(--mono);
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: var(--text);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: var(--s2);
          flex: 1;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: calc(100% - 20px);
          padding: 4px 2px;
          margin: 10px 8px 0;
          font-size: var(--t-sm);
          font-weight: 500;
          color: var(--text-2);
          text-decoration: none;
          transition: color var(--ease);
          border-bottom: 2px solid transparent;
        }
        .nav-link:hover { color: var(--text); }
        .nav-link--on { color: var(--text); border-bottom-color: var(--accent); }

        .nav-right { margin-left: auto; }

        .nav-player {
          display: flex;
          align-items: center;
          gap: var(--s3);
        }

        .nav-online {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--green);
        }

        .nav-chip {
          display: flex;
          align-items: center;
          gap: var(--s2);
          background: var(--surface);
          border: 1px solid var(--border-2);
          border-radius: var(--r-md);
          padding: 3px 10px 3px 3px;
          text-decoration: none;
          transition: border-color var(--ease);
        }

        .nav-chip:hover { border-color: var(--border-3); }

        .nav-chip-name {
          font-size: var(--t-sm);
          font-weight: 600;
          color: var(--text);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-leave {
          width: 28px;
          height: 28px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border-2);
          background: var(--surface);
          color: var(--text-3);
          font-size: 15px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--ease), border-color var(--ease), background var(--ease);
        }
        .nav-leave:hover {
          color: var(--red);
          border-color: var(--red);
          background: var(--red-dim);
        }

        .nav-cta { padding: 7px 16px; font-size: var(--t-sm); }

        @media (max-width: 600px) {
          .nav-online { display: none; }
          .nav-chip-name { max-width: 75px; }
          .nav-brand-text { display: none; }
          .nav-link { margin: 10px 4px 0; }
        }
      `}</style>
    </nav>
  );
}
