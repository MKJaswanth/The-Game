import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { GAMES_CATALOG } from '../data/games.js';
import GameCard from '../components/GameCard.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/Avatar.jsx';

const TABS = [
  { id: 'all',         label: 'All' },
  { id: 'multiplayer', label: 'Multiplayer' },
  { id: 'solo',        label: 'Solo' },
  { id: 'coming-soon', label: 'Coming soon' },
];

export default function GameHub() {
  const { nickname, onlinePlayers, socket } = usePlayer();
  const navigate = useNavigate();

  const [selectedGame, setSelectedGame]             = useState(null);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState(4);
  const [filter, setFilter]                         = useState('all');
  const [joinCodeInput, setJoinCodeInput]           = useState('');
  const [roomError, setRoomError]                   = useState('');
  const [isProcessing, setIsProcessing]             = useState(false);
  const [directCode, setDirectCode]                 = useState('');
  const [directCodeError, setDirectCodeError]       = useState('');
  const [openRooms, setOpenRooms]                   = useState([]);
  const [openRoomError, setOpenRoomError]           = useState('');
  const [joiningRoomCode, setJoiningRoomCode]       = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('player_nickname');
    if (!nickname && !stored) navigate('/', { replace: true });
  }, [nickname, navigate]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleRoomsUpdate = (data) => {
      const rooms = Array.isArray(data) ? data : data?.rooms;
      if (Array.isArray(rooms)) setOpenRooms(rooms);
    };

    const requestRooms = () => {
      socket.emit('rooms:get', (res) => {
        if (res?.success && Array.isArray(res.rooms)) setOpenRooms(res.rooms);
      });
    };

    socket.on('rooms:update', handleRoomsUpdate);
    if (socket.connected) requestRooms();
    else socket.once('connect', requestRooms);

    return () => {
      socket.off('rooms:update', handleRoomsUpdate);
      socket.off('connect', requestRooms);
    };
  }, [socket]);

  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null);
  if (!currentNick) return null;

  const filtered = GAMES_CATALOG.filter((g) => {
    if (filter === 'all')         return true;
    if (filter === 'multiplayer') return g.isAvailable && g.minPlayers > 1;
    if (filter === 'solo')        return g.isAvailable && (g.supportsSolo || g.maxPlayers === 1);
    if (filter === 'coming-soon') return !g.isAvailable;
    return true;
  });

  const createRoom = (gameType, opts = {}) => {
    if (!socket?.connected) { setRoomError('Not connected'); return; }
    setIsProcessing(true); setRoomError('');
    socket.emit('room:create', { gameType, nickname: currentNick, maxPlayers: opts.maxPlayers || selectedMaxPlayers || 4, isSolo: Boolean(opts.isSolo) }, (res) => {
      setIsProcessing(false);
      if (res?.success) { setSelectedGame(null); navigate(`/room/${res.roomCode}`); }
      else setRoomError(res?.error || 'Failed to create room');
    });
  };

  const joinRoom = (code) => {
    const c = code.trim().toUpperCase();
    if (!c)          { setRoomError('Enter a room code'); return; }
    if (c.length !==6){ setRoomError('Code must be 6 characters'); return; }
    if (!socket?.connected) { setRoomError('Not connected'); return; }
    setIsProcessing(true); setRoomError('');
    socket.emit('room:join', { roomCode: c, nickname: currentNick }, (res) => {
      setIsProcessing(false);
      if (res?.success) { setSelectedGame(null); navigate(`/room/${c}`); }
      else setRoomError(res?.error || 'Room not found');
    });
  };

  const joinOpenRoom = (room) => {
    const code = room?.code?.trim().toUpperCase();
    if (!code || !socket?.connected) {
      setOpenRoomError('Not connected. Try again in a moment.');
      return;
    }

    setJoiningRoomCode(code);
    setOpenRoomError('');
    // socket.io acknowledgements have no deadline of their own: an ack lost on
    // the wire used to leave every open-room button disabled on "Joining…".
    socket.timeout(5000).emit('room:join', { roomCode: code, nickname: currentNick }, (err, res) => {
      setJoiningRoomCode('');
      if (err) {
        setOpenRoomError('Connection timed out. Please try again.');
        return;
      }
      if (res?.success) navigate(`/room/${code}`);
      else setOpenRoomError(res?.error || 'That room is no longer available.');
    });
  };

  const handleDirectJoin = (e) => {
    e.preventDefault();
    const c = directCode.trim().toUpperCase();
    if (c.length !== 6) { setDirectCodeError('Need 6 characters'); return; }
    setDirectCodeError('');
    socket.emit('room:join', { roomCode: c, nickname: currentNick }, (res) => {
      if (res?.success) navigate(`/room/${c}`);
      else setDirectCodeError(res?.error || 'Room not found');
    });
  };

  const displayPlayers = onlinePlayers.length > 0 ? onlinePlayers : [{ nickname: currentNick }];

  return (
    <>
      <div className="page hub">
        <div className="container">

          {/* Header */}
          <div className="hub-head">
            <div className="hub-greeting">
              <div className="hub-avatar-wrap">
                <Avatar nickname={currentNick} size="lg" />
                <span className="hub-avatar-status" />
              </div>
            <div className="hub-user-info">
              <div className="hub-user-badge">
                <span className="hub-user-pill">READY</span>
              </div>
              <h1 className="hub-title">
                Welcome back, <span className="hub-title-nick">{currentNick}</span>
              </h1>
              <p className="hub-sub">Jump into the arcade, challenge friends, or conquer the solo leaderboard.</p>
            </div>
            </div>

            <form className="hub-join-form" onSubmit={handleDirectJoin}>
              <div className="hub-join-label">
                <span>QUICK JOIN</span>
              </div>
              <div className="hub-join-inputs">
                <input
                  type="text"
                  className="input-field hub-code-input"
                  placeholder="ROOM CODE"
                  maxLength={6}
                  value={directCode}
                  onChange={(e) => { setDirectCode(e.target.value.toUpperCase()); setDirectCodeError(''); }}
                  aria-label="Room code"
                />
                <button type="submit" className="btn btn-primary hub-join-btn">
                  Join Room
                </button>
              </div>
              {directCodeError && <p className="field-error-text hub-code-err">{directCodeError}</p>}
            </form>
          </div>

          {/* Online strip */}
          <div className="hub-presence">
            <div className="hub-presence-label">
              <span className="dot-live" />
              <span>{displayPlayers.length} ONLINE NOW</span>
            </div>
            <div className="hub-players">
              {displayPlayers.slice(0, 10).map((p) => (
                <div key={p.nickname} className={`hub-player ${p.nickname === currentNick ? 'hub-player--you' : ''}`} title={p.nickname}>
                  <Avatar nickname={p.nickname} size="sm" />
                  <span className="hub-player-name">{p.nickname}</span>
                  {p.nickname === currentNick && <span className="hub-you">YOU</span>}
                </div>
              ))}
              {displayPlayers.length > 10 && (
                <span className="hub-overflow">+{displayPlayers.length - 10} more</span>
              )}
            </div>
          </div>

          {/* Open rooms */}
          <section className="hub-open-rooms" aria-labelledby="open-rooms-title">
            <div className="hub-section-head">
              <div>
                <div className="hub-section-kicker">OPEN ROOMS</div>
                <h2 id="open-rooms-title" className="hub-section-title">Jump into a live lobby</h2>
                <p className="hub-section-desc">Join a waiting room instantly — no code needed.</p>
              </div>
              <span className="hub-room-count">{openRooms.length} {openRooms.length === 1 ? 'room' : 'rooms'}</span>
            </div>

            {openRoomError && <div className="hub-open-room-error" role="status">{openRoomError}</div>}

            {openRooms.length > 0 ? (
              <div className="hub-open-room-grid">
                {openRooms.map((room) => {
                  const game = GAMES_CATALOG.find((g) => g.id === room.gameType);
                  const isJoining = joiningRoomCode === room.code;
                  return (
                    <div className="hub-open-room" key={room.code}>
                      <div className="hub-open-room-main">
                        <div className="hub-open-room-title-row">
                          <h3 className="hub-open-room-title">{game?.title || room.gameType}</h3>
                          <span className="hub-open-room-status"><span className="dot-live" /> WAITING</span>
                        </div>
                        <div className="hub-open-room-meta">
                          <span>Hosted by <strong>{room.hostNickname}</strong></span>
                          <span className="hub-open-room-code">{room.code}</span>
                        </div>
                      </div>
                      <div className="hub-open-room-action">
                        <span className="hub-open-room-slots">{room.currentPlayers}/{room.maxPlayers} players</span>
                        <button
                          type="button"
                          className="btn btn-primary hub-open-room-btn"
                          disabled={Boolean(joiningRoomCode)}
                          onClick={() => joinOpenRoom(room)}
                        >
                          {isJoining ? <><span className="spinner" /> Joining...</> : 'Join now'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="hub-open-room-empty">
                <span className="hub-open-room-empty-mark">+</span>
                <div>
                  <strong>No open rooms yet</strong>
                  <p>Create a multiplayer room below and it will appear here for everyone.</p>
                </div>
              </div>
            )}
          </section>

          {/* Filter */}
          <div className="hub-filter-row">
            <div className="hub-tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === t.id}
                  className={`hub-tab ${filter === t.id ? 'hub-tab--on' : ''}`}
                  onClick={() => setFilter(t.id)}
                >
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <span className="hub-count">Showing {filtered.length} games</span>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="hub-empty">
              <h3 className="hub-empty-title">No games in this category</h3>
              <p className="hub-empty-desc">Check back soon for new game drops or switch back to view all games.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setFilter('all')}>
                Show All Games
              </button>
            </div>
          ) : (
            <div className="hub-grid">
              {filtered.map((g, i) => (
                <div key={g.id} style={{ animation: `fadeUp 300ms var(--ease-spring) ${i * 45}ms both` }}>
                  <GameCard
                    game={g}
                    onSelect={(game) => {
                      setSelectedGame(game);
                      setSelectedMaxPlayers(Math.min(Math.max(4, game.minPlayers || 2), game.maxPlayers || 6));
                      setRoomError(''); setJoinCodeInput('');
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={Boolean(selectedGame)}
        onClose={() => { setSelectedGame(null); setRoomError(''); }}
        title={selectedGame?.title ?? ''}
      >
        {selectedGame && (
          <div className="modal-body">
            <p className="modal-desc">{selectedGame.description}</p>

            <div className="modal-meta">
              <span className="modal-meta-key">Players</span>
              <span className="modal-meta-val">{selectedGame.playerCount}</span>
            </div>

            {roomError && <div className="modal-err">{roomError}</div>}

            {/* Solo */}
            {selectedGame.supportsSolo && (
              <div className="modal-block modal-block--a">
                <div className="modal-block-head">
                  <span className="modal-block-title">Solo Play</span>
                  <span className="modal-block-note">Score goes to leaderboard</span>
                </div>
                <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--s3)' }} disabled={isProcessing} onClick={() => createRoom(selectedGame.id, { isSolo: true })}>
                  {isProcessing ? <><span className="spinner" /> Launching...</> : 'Play Solo'}
                </button>
              </div>
            )}

            {/* Multiplayer */}
            {selectedGame.maxPlayers > 1 && (
              <div className="modal-block modal-block--b">
                <div className="modal-block-head">
                  <span className="modal-block-title">Create Room</span>
                  <span className="modal-block-note">{selectedMaxPlayers} players</span>
                </div>

                {selectedGame.minPlayers < selectedGame.maxPlayers && (
                  <div className="modal-picker">
                    {Array.from({ length: selectedGame.maxPlayers - selectedGame.minPlayers + 1 }, (_, i) => selectedGame.minPlayers + i).map((n) => (
                      <button key={n} type="button" className={`modal-pick-btn ${selectedMaxPlayers === n ? 'modal-pick-btn--on' : ''}`} onClick={() => setSelectedMaxPlayers(n)}>{n}P</button>
                    ))}
                  </div>
                )}

                <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--s3)' }} disabled={isProcessing} onClick={() => createRoom(selectedGame.id, { maxPlayers: selectedMaxPlayers })}>
                  {isProcessing ? <><span className="spinner" /> Creating...</> : 'Create Room'}
                </button>
              </div>
            )}

            {selectedGame.maxPlayers > 1 && (
              <>
                <div className="divider">or join with code</div>
                <div className="modal-join-row">
                  <input
                    type="text" placeholder="6-CHAR CODE" maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="input-field"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, textAlign: 'center' }}
                  />
                  <button type="button" className="btn btn-primary" disabled={isProcessing || !joinCodeInput.trim()} onClick={() => joinRoom(joinCodeInput)}>
                    Join
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .hub-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--s5);
          margin-bottom: var(--s6);
          padding: var(--s5) var(--s6);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-xl);
        }
        .hub-greeting {
          display: flex;
          align-items: center;
          gap: var(--s4);
          flex: 1;
          min-width: 280px;
        }
        .hub-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .hub-avatar-status {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--green);
          border: 2px solid var(--surface);
        }
        .hub-user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hub-user-pill {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: var(--accent-hi);
          width: fit-content;
        }
        .hub-title {
          font-size: var(--t-2xl);
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .hub-title-nick { color: var(--text); }
        .hub-sub {
          font-size: var(--t-sm);
          color: var(--text-2);
          margin-top: 2px;
          max-width: 480px;
        }

        .hub-join-form {
          display: flex;
          flex-direction: column;
          gap: var(--s2);
          background: var(--bg-2);
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          padding: var(--s3) var(--s4);
        }
        .hub-join-label {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: var(--text-3);
          text-transform: uppercase;
        }
        .hub-join-inputs {
          display: flex;
          align-items: center;
          gap: var(--s2);
        }
        .hub-code-input {
          width: 130px;
          padding: 8px 10px;
          font-family: var(--mono);
          font-size: var(--t-sm);
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-align: center;
        }
        .hub-join-btn {
          padding: 8px 16px;
          font-size: var(--t-sm);
          white-space: nowrap;
        }
        .hub-code-err {
          position: absolute;
          bottom: -18px;
          left: var(--s4);
          font-size: 11px;
          white-space: nowrap;
          color: var(--red);
        }

        /* Online presence strip */
        .hub-presence {
          display: flex;
          align-items: center;
          gap: var(--s4);
          padding: var(--s3) var(--s5);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          background: var(--bg-2);
          margin-bottom: var(--s6);
          flex-wrap: wrap;
        }
        .hub-presence-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--text-2);
          letter-spacing: 0.14em;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .hub-players {
          display: flex;
          gap: var(--s2);
          flex-wrap: wrap;
          align-items: center;
        }
        .hub-player {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px 3px 3px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-pill);
          animation: slideIn 250ms var(--ease-spring) both;
          transition: border-color 150ms ease;
        }
        .hub-player:hover { border-color: var(--border-3); }
        .hub-player--you {
          border-color: var(--accent-soft);
          background: var(--accent-dim);
        }
        .hub-player-name {
          font-size: var(--t-xs);
          font-weight: 600;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text);
        }
        .hub-you {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 700;
          color: var(--accent-hi);
          letter-spacing: 0.08em;
        }
        .hub-overflow {
          font-family: var(--mono);
          font-size: var(--t-xs);
          color: var(--text-3);
          padding: 4px 10px;
          border: 1px dashed var(--border-2);
          border-radius: var(--r-pill);
        }

        /* Open room browser */
        .hub-open-rooms {
          padding: var(--s5);
          margin-bottom: var(--s7);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-xl);
        }
        .hub-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--s4);
          margin-bottom: var(--s4);
        }
        .hub-section-kicker {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--accent-hi);
        }
        .hub-section-title {
          margin-top: 3px;
          font-size: var(--t-xl);
          font-weight: 800;
          color: var(--text);
        }
        .hub-section-desc {
          margin-top: 2px;
          font-size: var(--t-sm);
          color: var(--text-2);
        }
        .hub-room-count {
          flex-shrink: 0;
          padding: 5px 10px;
          border: 1px solid var(--border-2);
          border-radius: var(--r-pill);
          color: var(--text-2);
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .hub-open-room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--s3);
        }
        .hub-open-room {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--s4);
          min-width: 0;
          padding: var(--s4);
          background: var(--bg-2);
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          transition: border-color var(--ease), background var(--ease);
        }
        .hub-open-room:hover {
          background: var(--surface-2);
          border-color: var(--border-3);
        }
        .hub-open-room-main { min-width: 0; }
        .hub-open-room-title-row {
          display: flex;
          align-items: center;
          gap: var(--s2);
          min-width: 0;
        }
        .hub-open-room-title {
          overflow: hidden;
          color: var(--text);
          font-size: var(--t-base);
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hub-open-room-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
          color: var(--green);
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .hub-open-room-status .dot-live { width: 6px; height: 6px; }
        .hub-open-room-meta {
          display: flex;
          align-items: center;
          gap: var(--s3);
          margin-top: 4px;
          color: var(--text-2);
          font-size: var(--t-xs);
        }
        .hub-open-room-meta strong { color: var(--text); font-weight: 700; }
        .hub-open-room-code {
          color: var(--accent-hi);
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }
        .hub-open-room-action {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--s2);
          flex-shrink: 0;
        }
        .hub-open-room-slots {
          color: var(--text-3);
          font-family: var(--mono);
          font-size: 10px;
          white-space: nowrap;
        }
        .hub-open-room-btn { padding: 7px 12px; font-size: var(--t-xs); }
        .hub-open-room-btn .spinner { width: 12px; height: 12px; border-width: 2px; }
        .hub-open-room-error {
          margin-bottom: var(--s3);
          padding: var(--s3) var(--s4);
          background: var(--red-dim);
          border: 1px solid rgba(208,104,97,0.35);
          border-radius: var(--r-md);
          color: var(--red);
          font-size: var(--t-sm);
        }
        .hub-open-room-empty {
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s4);
          background: var(--bg-2);
          border: 1px dashed var(--border-2);
          border-radius: var(--r-lg);
          color: var(--text-2);
        }
        .hub-open-room-empty-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: 1px solid var(--border-2);
          border-radius: 50%;
          color: var(--accent-hi);
          font-size: var(--t-lg);
        }
        .hub-open-room-empty strong { color: var(--text); font-size: var(--t-sm); }
        .hub-open-room-empty p { margin-top: 2px; font-size: var(--t-xs); }

        /* Filter row */
        .hub-filter-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--s4);
          margin-bottom: var(--s5);
          flex-wrap: wrap;
        }
        .hub-tabs {
          display: flex;
          gap: var(--s4);
          border-bottom: 1px solid var(--border);
        }
        .hub-tab {
          padding: 8px 2px;
          border-radius: 0;
          font-size: var(--t-sm);
          font-weight: 500;
          color: var(--text-2);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease;
          white-space: nowrap;
        }
        .hub-tab:hover { color: var(--text); }
        .hub-tab--on {
          color: var(--text);
          border-bottom-color: var(--accent);
          font-weight: 600;
        }
        .hub-count {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-3);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        /* Grid */
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: var(--s4);
          padding-bottom: var(--s12);
        }

        /* Empty state */
        .hub-empty {
          text-align: center;
          padding: var(--s16) var(--s6);
          border: 1px dashed var(--border-2);
          border-radius: var(--r-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--s3);
        }
        .hub-empty-title { font-size: var(--t-xl); font-weight: 700; color: var(--text); }
        .hub-empty-desc { font-size: var(--t-sm); color: var(--text-2); max-width: 360px; margin-bottom: var(--s2); }

        /* Modal */
        .modal-body { display: flex; flex-direction: column; gap: var(--s4); }
        .modal-desc { color: var(--text-2); font-size: var(--t-sm); line-height: 1.6; }
        .modal-meta {
          display: flex; align-items: center; gap: var(--s3);
          padding: var(--s3) var(--s4);
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
        }
        .modal-meta-key { font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.12em; }
        .modal-meta-val { font-size: var(--t-sm); font-weight: 600; }
        .modal-err {
          padding: var(--s3) var(--s4);
          background: var(--red-dim);
          border: 1px solid rgba(208,104,97,0.35);
          border-radius: var(--r-md);
          color: var(--red); font-size: var(--t-sm);
        }
        .modal-block {
          padding: var(--s4);
          border-radius: var(--r-md);
          display: flex; flex-direction: column; gap: var(--s2);
          border: 1px solid var(--border);
          background: var(--bg-2);
        }
        .modal-block-head { display: flex; align-items: center; justify-content: space-between; }
        .modal-block-title { font-size: var(--t-sm); font-weight: 700; color: var(--text); }
        .modal-block-note { font-family: var(--mono); font-size: 10px; color: var(--text-3); }
        .modal-picker { display: flex; gap: var(--s2); flex-wrap: wrap; margin-top: var(--s2); }
        .modal-pick-btn {
          flex: 1; min-width: 40px; padding: 6px 10px;
          border-radius: var(--r-sm);
          background: var(--surface-2);
          border: 1px solid var(--border-2);
          color: var(--text-2);
          font-family: var(--mono);
          font-size: var(--t-xs);
          font-weight: 600;
          cursor: pointer;
          transition: border-color var(--ease), color var(--ease), background var(--ease);
        }
        .modal-pick-btn:hover { border-color: var(--border-3); color: var(--text); }
        .modal-pick-btn--on {
          background: var(--accent);
          border-color: var(--accent);
          color: #16130c;
        }
        .modal-join-row { display: flex; gap: var(--s2); }
        .modal-join-row .input-field { flex: 1; min-width: 0; }
        .modal-join-row .btn { flex: 0 0 auto; }

        @media (max-width: 600px) {
          .hub-head { flex-direction: column; align-items: stretch; }
          .hub-join-form { width: 100%; }
          .hub-code-input { flex: 1; width: auto; }
          .hub-section-head { flex-direction: column; }
          .hub-open-room { align-items: stretch; flex-direction: column; }
          .hub-open-room-action { align-items: stretch; }
          .hub-open-room-btn { width: 100%; }
          .hub-open-room-grid { grid-template-columns: 1fr; }
          .hub-grid { grid-template-columns: 1fr; }
          .hub-tabs { width: 100%; overflow-x: auto; }
          .hub-tab { flex-shrink: 0; padding: 8px 10px; }
        }
      `}</style>
    </>
  );
}
