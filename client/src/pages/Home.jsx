import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { validateNickname } from '../utils/validation.js';

export default function Home() {
  const [nicknameInput, setNicknameInput] = useState('');
  const [localError, setLocalError] = useState('');
  const [savedNick, setSavedNick] = useState(null);
  const { nickname, joinHub, isJoining, joinError, setJoinError } = usePlayer();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('player_nickname');
    if (stored) {
      setNicknameInput(stored);
      setSavedNick(stored);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setJoinError(null);

    const validation = validateNickname(nicknameInput);
    if (!validation.valid) {
      setLocalError(validation.error);
      return;
    }

    try {
      await joinHub(validation.value);
      navigate('/hub');
    } catch (err) {
      setLocalError(err.message || 'Could not join. Please try again.');
    }
  };

  const activeError = localError || joinError;

  return (
    <div className="page page-home">
      <div className="container hero-container">
        {/* Glow backdrop element */}
        <div className="hero-glow" aria-hidden="true"></div>

        <div className="hero-content">
          <div className="badge badge-accent" style={{ marginBottom: 'var(--space-4)', alignSelf: 'center' }}>
            ⚡ Instant Play • No Passwords Needed
          </div>

          <h1 className="hero-title">
            The Game
          </h1>

          <p className="hero-subtitle">
            A real-time browser gaming arena for the team. Pick a nickname, challenge your teammates, and climb the leaderboard.
          </p>

          {/* Nickname Join Card */}
          <div className="card hero-card" style={{
            maxWidth: '460px',
            width: '100%',
            padding: 'var(--space-8)',
            margin: '0 auto',
            backdropFilter: 'blur(16px)',
            background: 'rgba(22, 25, 40, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'left' }}>
                <label
                  htmlFor="nickname-input"
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    marginBottom: 'var(--space-2)',
                    color: 'var(--color-text)'
                  }}
                >
                  Choose Your Nickname
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="nickname-input"
                    type="text"
                    className={`input-field ${activeError ? 'input-error' : ''}`}
                    placeholder="e.g. CyberViper, PixelFox"
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
                    style={{
                      paddingLeft: '44px',
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 500
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.25rem',
                    pointerEvents: 'none',
                    opacity: 0.7
                  }}>
                    🎮
                  </span>
                </div>
                {activeError && (
                  <div className="field-error-text" style={{ marginTop: 'var(--space-2)', fontWeight: 500 }}>
                    {activeError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="join-hub-btn"
                className="btn btn-primary"
                disabled={isJoining}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 700,
                  marginTop: 'var(--space-2)'
                }}
              >
                {isJoining ? (
                  <span>Joining Arena...</span>
                ) : savedNick && savedNick === nicknameInput.trim() ? (
                  `Play as ${savedNick} →`
                ) : (
                  'Enter Arena →'
                )}
              </button>
            </form>

            <div style={{
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--color-surface-border)',
              display: 'flex',
              justifyContent: 'space-around',
              color: 'var(--color-text-dim)',
              fontSize: 'var(--font-size-xs)'
            }}>
              <span>🐍 Snake</span>
              <span>•</span>
              <span>🧠 Trivia</span>
              <span>•</span>
              <span>🔤 Word Scramble</span>
              <span>•</span>
              <span>❌ Tic Tac Toe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
