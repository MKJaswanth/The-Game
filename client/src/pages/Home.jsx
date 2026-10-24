import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { validateNickname } from '../utils/validation.js';
import { GAMES_CATALOG } from '../data/games.js';
import Avatar from '../components/Avatar.jsx';

// Every game in the cabinet, straight from the shared catalog so the landing
// page can never drift out of sync with the hub.
const GAMES = GAMES_CATALOG.map((g, i) => ({
  tag: String(i + 1).padStart(2, '0'),
  name: g.title,
  mode: g.playerCount.replace(' Players', ' players').replace(' Player', ' player'),
  live: g.isAvailable,
}));
const LIVE_COUNT = GAMES.filter((g) => g.live).length;

export default function Home() {
  const [nicknameInput, setNicknameInput] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : '') || '';
  });
  const [localError, setLocalError] = useState('');
  const [savedNick] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null) || null;
  });
  const { joinHub, isJoining, joinError, setJoinError } = usePlayer();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setJoinError(null);
    const validation = validateNickname(nicknameInput);
    if (!validation.valid) { setLocalError(validation.error); return; }
    try {
      await joinHub(validation.value);
      navigate('/hub');
    } catch (err) {
      setLocalError(err.message || 'Could not join. Try again.');
    }
  };

  const activeError = localError || joinError;
  const isSavedNick = savedNick && savedNick === nicknameInput.trim();
  const btnLabel = isJoining ? 'Entering…' : isSavedNick ? 'Continue' : 'Enter the hub';

  const previewName = nicknameInput.trim() || 'Player';

  return (
    <div className="home">
      <div className="container home-body">

        {/* Left: copy */}
        <div className="home-copy">
          <div className="home-eyebrow">
            <span className="dot-live" />
            <span>Live multiplayer arcade</span>
          </div>

          <h1 className="home-title">
            Play together.<br />
            Win together.
          </h1>

          <p className="home-desc">
            No downloads, no signup. Drop a six-character code into your
            browser and you're in a live room — chat, match against the bot,
            or take a solo run at the leaderboard.
          </p>

          <ul className="home-games">
            {GAMES.map((g) => (
              <li className={`home-game ${g.live ? '' : 'is-soon'}`} key={g.tag}>
                <span className="home-game-num">{g.tag}</span>
                <span className="home-game-name">{g.name}</span>
                <span className="home-game-mode">{g.mode}</span>
                <span className={`home-game-tag ${g.live ? 'is-live' : ''}`}>
                  {g.live ? 'Live' : 'Soon'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form */}
        <div className="home-form-wrap">
          <form className="home-form" onSubmit={handleSubmit} noValidate>
            <div className="home-avatar-card">
              <Avatar nickname={previewName} size="md" />
              <div className="home-avatar-meta">
                <span className="home-avatar-label">Callsign</span>
                <div className="home-avatar-name">{previewName}</div>
              </div>
              <span className="home-avatar-ready">Ready</span>
            </div>

            <div className="home-field">
              <label htmlFor="nickname-input" className="home-label">Choose your callsign</label>
              <input
                id="nickname-input"
                type="text"
                className={`input-field home-input ${activeError ? 'input-error' : ''}`}
                placeholder="e.g. NightOwl"
                value={nicknameInput}
                onChange={(e) => {
                  setNicknameInput(e.target.value);
                  if (localError) setLocalError('');
                  if (joinError) setJoinError(null);
                }}
                disabled={isJoining}
                autoComplete="off"
                autoFocus
                maxLength={20}
              />
              {activeError && (
                <p className="field-error-text" role="alert">{activeError}</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary home-btn" disabled={isJoining}>
              {isJoining ? <><span className="spinner" />{btnLabel}</> : btnLabel}
            </button>

            <p className="home-hint">
              <span className="mono">3–20</span> characters · letters &amp; numbers · no login
            </p>
          </form>

          <p className="home-foot">
            Runs entirely in your browser · {LIVE_COUNT} of {GAMES.length} games live
          </p>
        </div>
      </div>

      <style>{`
        .home {
          position: relative;
          min-height: calc(100dvh - 56px);
          display: flex;
          align-items: center;
        }

        .home-body {
          width: 100%;
          display: grid;
          grid-template-columns: 1.15fr 400px;
          gap: var(--s12);
          align-items: center;
          padding-top: var(--s12);
          padding-bottom: var(--s12);
        }

        .home-copy {
          display: flex;
          flex-direction: column;
          gap: var(--s5);
          align-items: flex-start;
        }

        .home-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: var(--s2);
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-2);
        }

        .home-title {
          font-size: clamp(2.6rem, 5.5vw, 4rem);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -0.035em;
          color: var(--text);
        }

        .home-desc {
          font-size: var(--t-lg);
          color: var(--text-2);
          line-height: 1.65;
          max-width: 46ch;
        }

        .home-games {
          list-style: none;
          width: 100%;
          max-width: 520px;
          border-top: 1px solid var(--border);
        }
        .home-game {
          display: flex;
          align-items: baseline;
          gap: var(--s3);
          padding: 9px 0;
          border-bottom: 1px solid var(--border);
          transition: padding-left 150ms ease;
        }
        .home-game:hover { padding-left: 6px; }
        .home-game.is-soon { opacity: 0.5; }
        .home-game-num {
          font-family: var(--mono);
          font-size: 0.68rem;
          color: var(--text-3);
        }
        .home-game-name {
          font-size: var(--t-sm);
          font-weight: 600;
          color: var(--text);
          min-width: 118px;
        }
        .home-game-mode {
          font-size: var(--t-xs);
          color: var(--text-3);
          margin-left: auto;
          text-align: right;
        }
        .home-game-tag {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-3);
          border: 1px solid var(--border-2);
          border-radius: var(--r-sm);
          padding: 2px 6px;
          min-width: 42px;
          text-align: center;
        }
        .home-game-tag.is-live { color: var(--green); border-color: rgba(105, 169, 126, 0.4); }

        .home-form-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--s3);
          animation: fadeUp 300ms var(--ease-spring) 80ms both;
        }

        .home-form {
          background: var(--surface);
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          padding: var(--s6);
          display: flex;
          flex-direction: column;
          gap: var(--s5);
        }

        .home-avatar-card {
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s3);
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
        }
        .home-avatar-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          flex: 1;
        }
        .home-avatar-label {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-3);
        }
        .home-avatar-name {
          font-size: var(--t-base);
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .home-avatar-ready {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--green);
        }

        .home-field { display: flex; flex-direction: column; gap: var(--s2); }

        .home-label {
          font-size: var(--t-sm);
          font-weight: 600;
          color: var(--text);
        }

        .home-input { font-size: var(--t-lg) !important; font-weight: 600 !important; }

        .home-btn {
          width: 100%;
          padding: 13px;
          font-size: var(--t-base);
          font-weight: 700;
        }

        .home-hint {
          font-size: var(--t-xs);
          color: var(--text-3);
          text-align: center;
        }
        .home-hint .mono {
          color: var(--text-2);
          font-size: 10px;
        }

        .home-foot {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-3);
          text-align: center;
        }

        @media (max-width: 860px) {
          .home-body {
            grid-template-columns: 1fr;
            gap: var(--s8);
            padding-top: var(--s8);
            padding-bottom: var(--s8);
          }
          .home-title { font-size: clamp(2.2rem, 8vw, 3rem); }
        }

        @media (max-width: 600px) {
          .home-body { gap: var(--s6); padding-top: var(--s6); padding-bottom: var(--s6); }
          .home-copy { gap: var(--s4); }
          .home-desc { font-size: var(--t-sm); line-height: 1.55; }
          .home-game { gap: var(--s2); align-items: center; }
          .home-game-num { flex: 0 0 20px; }
          .home-game-name { min-width: 0; flex: 1; font-size: var(--t-sm); }
          .home-game-mode {
            flex: 0 1 82px;
            max-width: 82px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .home-game-tag { flex: 0 0 42px; }
          .home-form { padding: var(--s5); }
        }
      `}</style>
    </div>
  );
}
