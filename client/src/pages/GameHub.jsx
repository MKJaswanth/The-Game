import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { GAMES_CATALOG } from '../data/games.js';
import GameCard from '../components/GameCard.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';

export default function GameHub() {
  const { nickname, onlinePlayers, socket } = usePlayer();
  const navigate = useNavigate();

  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState(4);
  const [filter, setFilter] = useState('all');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomActionError, setRoomActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Direct join code on header
  const [directCode, setDirectCode] = useState('');
  const [directCodeError, setDirectCodeError] = useState('');

  // M1-13: Redirect unauthenticated users to home
  useEffect(() => {
    const stored = localStorage.getItem('player_nickname');
    if (!nickname && !stored) {
      navigate('/', { replace: true });
    }
  }, [nickname, navigate]);

  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null);
  if (!currentNick) {
    return null;
  }

  // Filter games
  const filteredGames = GAMES_CATALOG.filter((game) => {
    if (filter === 'all') return true;
    if (filter === 'multiplayer') return game.isAvailable && game.minPlayers > 1;
    if (filter === 'solo') return game.isAvailable && (game.supportsSolo || game.maxPlayers === 1);
    if (filter === 'coming-soon') return !game.isAvailable;
    return true;
  });

  // Handle Create Room
  const handleCreateRoom = (gameType, options = {}) => {
    if (!socket || !socket.connected) {
      setRoomActionError('Socket disconnected. Reconnecting...');
      return;
    }
    setIsProcessing(true);
    setRoomActionError('');

    const payload = {
      gameType,
      nickname: currentNick,
      maxPlayers: options.maxPlayers || selectedMaxPlayers || 4,
      isSolo: Boolean(options.isSolo)
    };

    socket.emit('room:create', payload, (response) => {
      setIsProcessing(false);
      if (response && response.success) {
        setSelectedGame(null);
        navigate(`/room/${response.roomCode}`);
      } else {
        setRoomActionError(response?.error || 'Failed to create room. Please try again.');
      }
    });
  };

  // Handle Join Room by code
  const handleJoinRoom = (codeToJoin) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode) {
      setRoomActionError('Please enter a room code');
      return;
    }
    if (cleanCode.length !== 6) {
      setRoomActionError('Room code must be exactly 6 characters');
      return;
    }

    if (!socket || !socket.connected) {
      setRoomActionError('Socket disconnected. Reconnecting...');
      return;
    }

    setIsProcessing(true);
    setRoomActionError('');

    socket.emit('room:join', { roomCode: cleanCode, nickname: currentNick }, (response) => {
      setIsProcessing(false);
      if (response && response.success) {
        setSelectedGame(null);
        navigate(`/room/${cleanCode}`);
      } else {
        setRoomActionError(response?.error || 'Failed to join room. Verify code.');
      }
    });
  };

  const handleDirectJoinSubmit = (e) => {
    e.preventDefault();
    setDirectCodeError('');
    const clean = directCode.trim().toUpperCase();
    if (clean.length !== 6) {
      setDirectCodeError('Enter 6-char code');
      return;
    }
    socket.emit('room:join', { roomCode: clean, nickname: currentNick }, (response) => {
      if (response && response.success) {
        navigate(`/room/${clean}`);
      } else {
        setDirectCodeError(response?.error || 'Room not found');
      }
    });
  };

  return (
    <div className="page page-hub">
      <div className="container">
        {/* Top Header / Player Banner */}
        <header className="page-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-8)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <Avatar nickname={currentNick} size="md" />
              <div>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                  Welcome back, <span style={{ color: 'var(--color-accent-light)' }}>{currentNick}</span>!
                </h1>
                <p className="page-desc" style={{ marginTop: 0 }}>
                  Jump into a game, create a private room, or challenge a teammate.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Room Code Input Box */}
          <div className="card" style={{
            padding: 'var(--space-4) var(--space-5)',
            background: 'rgba(22, 25, 40, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}>
            <form onSubmit={handleDirectJoinSubmit} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="HAVE A CODE? (6-CHAR)"
                maxLength={6}
                value={directCode}
                onChange={(e) => setDirectCode(e.target.value.toUpperCase())}
                className="input-field"
                style={{
                  width: '180px',
                  padding: '8px 12px',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}
              />
              <button type="submit" className="btn btn-accent" style={{ padding: '8px 16px', fontSize: 'var(--font-size-xs)' }}>
                Join →
              </button>
            </form>
            {directCodeError && (
              <span className="field-error-text" style={{ fontSize: '11px', marginTop: 0 }}>
                {directCodeError}
              </span>
            )}
          </div>
        </header>

        {/* Live Online Presence Bar */}
        <section style={{
          marginBottom: 'var(--space-8)',
          background: 'rgba(22, 25, 40, 0.5)',
          padding: 'var(--space-4) var(--space-6)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-surface-border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-3)'
          }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              🟢 ONLINE TEAMMATES ({onlinePlayers.length || 1})
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
              Live Presence Active
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            {onlinePlayers.length > 0 ? (
              onlinePlayers.map((player) => (
                <div
                  key={player.nickname}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-surface-hover)'
                  }}
                >
                  <Avatar nickname={player.nickname} size="sm" />
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                    {player.nickname}
                  </span>
                  {player.nickname === currentNick && (
                    <Badge variant="accent" style={{ fontSize: '9px', padding: '1px 5px' }}>YOU</Badge>
                  )}
                </div>
              ))
            ) : (
              <div
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <Avatar nickname={currentNick} size="sm" />
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                  {currentNick}
                </span>
                <Badge variant="accent" style={{ fontSize: '9px', padding: '1px 5px' }}>YOU</Badge>
              </div>
            )}
          </div>
        </section>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Games' },
              { id: 'multiplayer', label: 'Multiplayer' },
              { id: 'solo', label: 'Solo / Casual' },
              { id: 'coming-soon', label: 'Coming Soon' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn ${filter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '8px 16px',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-full)'
                }}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
            Showing {filteredGames.length} games
          </span>
        </div>

        {/* Game Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-12)'
        }}>
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={(g) => {
                setSelectedGame(g);
                setSelectedMaxPlayers(Math.min(Math.max(4, g.minPlayers || 2), g.maxPlayers || 6));
                setRoomActionError('');
                setJoinCodeInput('');
              }}
            />
          ))}
        </div>
      </div>

      {/* Game Action Modal (Create / Join / Play) */}
      <Modal
        isOpen={Boolean(selectedGame)}
        onClose={() => {
          setSelectedGame(null);
          setRoomActionError('');
        }}
        title={selectedGame ? `${selectedGame.icon} ${selectedGame.title}` : ''}
      >
        {selectedGame && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
              {selectedGame.description}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', fontWeight: 600 }}>
                PLAYER LIMIT:
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                {selectedGame.playerCount}
              </span>
            </div>

            {roomActionError && (
              <div className="field-error-text" style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                {roomActionError}
              </div>
            )}

            {/* Solo Mode Option if supported */}
            {selectedGame.supportsSolo && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-accent-light)' }}>
                    ⚡ SOLO PLAY (1 PLAYER)
                  </span>
                  <Badge variant="accent" style={{ fontSize: '10px' }}>Instant Match</Badge>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                  Play right away without waiting for teammates. Submit your high score to the global leaderboard.
                </p>
                <button
                  type="button"
                  className="btn btn-accent"
                  style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 700 }}
                  disabled={isProcessing}
                  onClick={() => handleCreateRoom(selectedGame.id, { isSolo: true })}
                >
                  {isProcessing ? 'Launching...' : `Play ${selectedGame.title} Solo →`}
                </button>
              </div>
            )}

            {/* Multiplayer Room Creation (if maxPlayers > 1) */}
            {selectedGame.maxPlayers > 1 && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                    👥 CREATE MULTIPLAYER ROOM
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
                    Max: {selectedMaxPlayers} Players
                  </span>
                </div>

                {/* Player Limit Selector */}
                {selectedGame.minPlayers < selectedGame.maxPlayers && (
                  <div>
                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
                      Choose How Many Players (Capacity):
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {Array.from(
                        { length: selectedGame.maxPlayers - selectedGame.minPlayers + 1 },
                        (_, i) => selectedGame.minPlayers + i
                      ).map((count) => {
                        const isSelected = selectedMaxPlayers === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              flex: 1,
                              minWidth: '50px',
                              padding: '8px 10px',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 800,
                              borderColor: isSelected ? 'var(--color-accent)' : undefined
                            }}
                            onClick={() => setSelectedMaxPlayers(count)}
                          >
                            {count}P
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                  disabled={isProcessing}
                  onClick={() => handleCreateRoom(selectedGame.id, { maxPlayers: selectedMaxPlayers, isSolo: false })}
                >
                  {isProcessing ? 'Creating Room...' : `Create Room (${selectedGame.minPlayers === selectedGame.maxPlayers ? `${selectedGame.maxPlayers} Players` : `${selectedMaxPlayers} Players`}) →`}
                </button>
                <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', margin: 0, textAlign: 'center' }}>
                  You will get a private 6-character room code to invite teammates.
                </p>
              </div>
            )}

            {/* Join Room by Code (if maxPlayers > 1) */}
            {selectedGame.maxPlayers > 1 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  color: 'var(--color-text-dim)',
                  fontSize: 'var(--font-size-xs)',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-3)'
                }}>
                  <span style={{ flex: 1, height: '1px', background: 'var(--color-surface-border)' }}></span>
                  <span>OR JOIN WITH CODE</span>
                  <span style={{ flex: 1, height: '1px', background: 'var(--color-surface-border)' }}></span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="ENTER 6-CHAR CODE"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="input-field"
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-accent"
                    disabled={isProcessing || !joinCodeInput.trim()}
                    onClick={() => handleJoinRoom(joinCodeInput)}
                    style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                  >
                    Join Room
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
