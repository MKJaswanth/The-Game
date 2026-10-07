import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { GAMES_CATALOG } from '../data/games.js';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Snake from '../games/snake/Snake.jsx';
import WordScramble from '../games/wordscramble/WordScramble.jsx';
import Trivia from '../games/trivia/Trivia.jsx';

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { nickname, socket } = usePlayer();

  const [roomState, setRoomState] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roomCode = code?.toUpperCase()?.trim();
  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null);

  useEffect(() => {
    // If not authenticated, redirect to home
    if (!currentNick) {
      navigate('/', { replace: true });
      return;
    }

    if (!socket) return;

    // Join / fetch room state on mount
    socket.emit('room:get', { roomCode }, (res) => {
      if (res && res.success && res.room) {
        setRoomState(res.room);
        setLoading(false);
      } else {
        // Try joining the room if not already in it
        socket.emit('room:join', { roomCode, nickname: currentNick }, (joinRes) => {
          setLoading(false);
          if (joinRes && joinRes.success) {
            setRoomState(joinRes.room);
          } else {
            setError(joinRes?.error || 'Room not found. Check code and try again.');
          }
        });
      }
    });

    // Listen to real-time room updates
    function handleRoomState(updated) {
      if (updated && updated.code === roomCode) {
        setRoomState(updated);
        setLoading(false);
      }
    }

    function handleGameStart(data) {
      console.log('[Room] Game started:', data);
    }

    socket.on('room:state', handleRoomState);
    socket.on('game:start', handleGameStart);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('game:start', handleGameStart);
    };
  }, [roomCode, currentNick, socket, navigate]);

  const handleStartGame = () => {
    if (!socket || !canStart) return;
    socket.emit('room:start', { roomCode }, (res) => {
      if (res && !res.success) {
        setError(res.error);
      }
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('room:leave', { roomCode, nickname: currentNick });
    }
    navigate('/hub');
  };

  // Auto-start solo games (single player room)
  useEffect(() => {
    if (
      roomState &&
      (roomState.gameType === 'wordscramble' || roomState.gameType === 'trivia') &&
      roomState.status === 'waiting' &&
      roomState.players.length === 1 &&
      (roomState.capacity?.max === 1 || roomState.isSolo) &&
      socket
    ) {
      socket.emit('room:start', { roomCode }, (res) => {
        if (res && !res.success) {
          setError(res.error);
        }
      });
    }
  }, [roomState, roomCode, socket]);

  if (loading) {
    return (
      <div className="page page-room">
        <div className="container" style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <div className="card" style={{ maxWidth: '400px', margin: '0 auto', padding: 'var(--space-8)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>⏳</div>
            <h3>Connecting to Room {roomCode}...</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
              Syncing state with server
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !roomState) {
    return (
      <div className="page page-room">
        <div className="container" style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <div className="card" style={{ maxWidth: '440px', margin: '0 auto', padding: 'var(--space-8)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🚫</div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>Room Unavailable</h2>
            <p className="field-error-text" style={{ marginBottom: 'var(--space-6)' }}>
              {error || 'Room not found or no longer active.'}
            </p>
            <div className="button-group">
              <Link to="/hub" className="btn btn-primary">Back to Game Hub</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const gameInfo = GAMES_CATALOG.find((g) => g.id === roomState.gameType) || {
    title: roomState.gameType,
    icon: '🎮',
    playerCount: 'Multiplayer'
  };

  const GAME_RULES = {
    wordscramble: {
      title: 'Match Format: 10 Synchronized Word Rounds',
      desc: 'Each round gives 30s to unscramble letters. Speed bonuses awarded. The match ends automatically after Round 10 with final podium rankings.',
      badge: '10 Rounds Total',
      icon: '🔤'
    },
    trivia: {
      title: 'Match Format: 10 Synchronized Quiz Questions',
      desc: 'Each question has a 15-second timer. Points awarded for correct answers + speed bonus. Match concludes after Question 10.',
      badge: '10 Questions Total',
      icon: '🧠'
    },
    tictactoe: {
      title: 'Match Format: Head-to-Head 1v1 Duel',
      desc: 'Turn-based battle on a 3x3 grid. Match concludes immediately upon 3-in-a-row or a full board draw, followed by instant rematch options.',
      badge: '1 Match to Finish',
      icon: '❌⭕'
    },
    snake: {
      title: 'Match Format: Solo Survival Score Attack',
      desc: 'Eat food to grow and accelerate. Match concludes when snake collides with wall or tail.',
      badge: 'Survival Mode',
      icon: '🐍'
    }
  };

  const currentRules = GAME_RULES[roomState.gameType] || {
    title: 'Match Format: Standard Room',
    desc: 'Compete in real time. Final scores will be saved upon completion.',
    badge: 'Standard Match',
    icon: '🏁'
  };

  const isHost = roomState.hostNickname === currentNick;
  const canStart = isHost && roomState.players.length >= (roomState.capacity?.min || 1);

  return (
    <div className="page page-room">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Room Header Card */}
        <div className="card" style={{
          padding: 'var(--space-6) var(--space-8)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          background: 'rgba(22, 25, 40, 0.9)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <span style={{ fontSize: '1.75rem' }}>{gameInfo.icon}</span>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                {gameInfo.title}
              </h1>
              <Badge variant="accent">
                {roomState.status === 'in_game' ? 'GAME IN PROGRESS' : 'ACTIVE SESSION'}
              </Badge>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              Player: <strong style={{ color: '#fff' }}>{currentNick}</strong> • Code: <strong>{roomCode}</strong>
            </p>
          </div>

          {/* Room Code Badge & Copy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-surface-border)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', fontWeight: 700, letterSpacing: '0.05em' }}>
                ROOM CODE
              </div>
              <div style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 800,
                color: 'var(--color-accent-light)',
                letterSpacing: '0.15em'
              }}>
                {roomCode}
              </div>
            </div>

            <button
              type="button"
              id="copy-room-code-btn"
              onClick={handleCopyCode}
              className={`btn ${copied ? 'btn-accent' : 'btn-secondary'}`}
              style={{ padding: '12px 16px', minWidth: '100px' }}
              title="Copy code to share with teammates"
            >
              {copied ? 'Copied! ✓' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* If Snake game: render Snake Game Engine */}
        {roomState.gameType === 'snake' ? (
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <Snake onExit={handleLeaveRoom} />
          </div>
        ) : roomState.gameType === 'wordscramble' && (roomState.status === 'in_game' || roomState.status === 'finished') ? (
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <WordScramble
              roomCode={roomCode}
              isHost={isHost}
              onExit={handleLeaveRoom}
            />
          </div>
        ) : roomState.gameType === 'trivia' && (roomState.status === 'in_game' || roomState.status === 'finished') ? (
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <Trivia
              roomCode={roomCode}
              isHost={isHost}
              onExit={handleLeaveRoom}
            />
          </div>
        ) : (
          /* Multiplayer Lobby View */
          <>
            <div className="card" style={{
              padding: 'var(--space-6) var(--space-8)',
              marginBottom: 'var(--space-6)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--color-surface-border)'
              }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                  Players in Room ({roomState.players.length} / {roomState.capacity?.max || 8})
                </h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
                  Min players to start: {roomState.capacity?.min || 1}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--space-3)'
              }}>
                {roomState.players.map((player) => (
                  <div
                    key={player.socketId || player.nickname}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-surface-hover)'
                    }}
                  >
                    <Avatar nickname={player.nickname} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 'var(--font-size-sm)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {player.nickname}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: '2px' }}>
                        {player.isHost && (
                          <Badge variant="warning" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            👑 HOST
                          </Badge>
                        )}
                        {player.nickname === currentNick && (
                          <Badge variant="accent" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            YOU
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Format & End Rules Banner */}
            <div className="card" style={{
              padding: 'var(--space-4) var(--space-6)',
              marginBottom: 'var(--space-6)',
              background: 'rgba(22, 25, 40, 0.65)',
              border: '1px solid var(--color-surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: '1.6rem' }}>{currentRules.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: '#fff' }}>
                    {currentRules.title}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {currentRules.desc}
                  </div>
                </div>
              </div>
              <Badge variant="accent" style={{ fontSize: '10px' }}>
                {currentRules.badge}
              </Badge>
            </div>

            {/* Action Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-4)'
            }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleLeaveRoom}
              >
                ← Leave Room
              </button>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {isHost ? (
                  <button
                    type="button"
                    id="start-game-btn"
                    className="btn btn-primary"
                    disabled={!canStart}
                    onClick={handleStartGame}
                    style={{ padding: '12px 28px', fontSize: 'var(--font-size-base)', fontWeight: 700 }}
                  >
                    {canStart ? '🚀 Start Game' : `Waiting for players (${roomState.players.length}/${roomState.capacity?.min})`}
                  </button>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center' }}>
                    Waiting for host (<strong>{roomState.hostNickname}</strong>) to start...
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
