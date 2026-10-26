import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { GAMES_CATALOG } from '../data/games.js';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import Snake from '../games/snake/Snake.jsx';
import WordScramble from '../games/wordscramble/WordScramble.jsx';
import Trivia from '../games/trivia/Trivia.jsx';
import TicTacToe from '../games/tictactoe/TicTacToe.jsx';
import Uno from '../games/uno/Uno.jsx';
import Flappy from '../games/flappy/Flappy.jsx';
import Chess from '../games/chess/Chess.jsx';
import Emoji from '../games/emoji/Emoji.jsx';
import Drawing from '../games/drawing/Drawing.jsx';
import Ludo from '../games/ludo/Ludo.jsx';

const RULES = {
  wordscramble: { title: '10 Word Rounds',     detail: '30 s per round, speed bonus applies' },
  trivia:       { title: '10 Questions',        detail: '15 s per question, first correct earns bonus' },
  tictactoe:    { title: '1v1 Match',           detail: 'First to 3-in-a-row wins' },
  uno:          { title: '108-Card Deck · 2–8 Players', detail: 'Match color or symbol · stack draw cards · call UNO with 1 card' },
  flappy:       { title: 'Neon Pipe Race',      detail: 'Last bird flying wins · Space / tap to flap' },
  chess:        { title: 'Classic 1v1',          detail: 'Server-validated moves · checkmate, draw & rematch' },
  emoji:        { title: '5 Emoji Rounds',       detail: '60 s per clue · clue-giver earns points too' },
  drawing:      { title: '5 Drawing Rounds',     detail: '80 s per round · drawer bonus · speed scoring' },
  ludo:         { title: 'Four-Token Race',      detail: 'Server dice · captures · safe squares · first home wins' },
  connect4:     { title: 'Solo Bot Match',       detail: 'Drop discs · block ConnectBot · connect four to win' },
  snake:        { title: 'Survival Run',        detail: 'Eat, grow, avoid walls — score to leaderboard' },
};

export default function Room() {
  const { code }      = useParams();
  const navigate      = useNavigate();
  const { nickname, socket } = usePlayer();

  const [room, setRoom]     = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  // Bumped on every socket reconnect so a live game re-fetches its state instead
  // of sitting on a board that stopped updating while the link was down.
  const [resumeNonce, setResumeNonce] = useState(0);
  const hasRoomRef = useRef(false);
  const pageUnloadingRef = useRef(false);

  const roomCode    = code?.toUpperCase()?.trim();
  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null);

  useEffect(() => {
    if (!currentNick) { navigate('/', { replace: true }); return; }
    if (!socket) return;

    // The token is this player's claim on their seat: it survives a refresh (per-tab
    // sessionStorage) and is the only thing that can take a live seat back.
    const tokenKey = `room_token_${roomCode}`;
    const readToken = () => (typeof window !== 'undefined' ? sessionStorage.getItem(tokenKey) : null);
    const saveToken = (t) => { if (t && typeof window !== 'undefined') sessionStorage.setItem(tokenKey, t); };

    let active = true;

    const joinRoom = () => socket.timeout(5000).emit('room:join', { roomCode, nickname: currentNick, token: readToken() }, (err, r) => {
      if (!active) return;
      setLoading(false);
      if (err) {
        if (!hasRoomRef.current) setError('Connection timed out. Please try again.');
        return;
      }
      if (r?.success) {
        saveToken(r.token);
        hasRoomRef.current = true;
        setError('');
        setRoom(r.room);
      } else setError(r?.error || 'Room not found');
    });

    const syncRoom = () => socket.timeout(5000).emit('room:get', { roomCode, nickname: currentNick, token: readToken() }, (err, res) => {
      if (!active) return;
      if (err) {
        setLoading(false);
        if (!hasRoomRef.current) setError('Connection timed out. Please try again.');
        return;
      }
      if (!res?.success || !res.room) { joinRoom(); return; }
      setLoading(false);
      if (res.token) saveToken(res.token);
      hasRoomRef.current = true;
      setError('');
      setRoom(res.room);

      const isMember = res.room.players?.some((p) => p.nickname === currentNick);
      if (!isMember && res.room.status === 'waiting') joinRoom();
      if (!isMember && res.room.status === 'in_game') setError('This game is already in progress.');
    });

    syncRoom();

    const onRoomState = (u) => { if (active && u?.code === roomCode) { setRoom(u); setLoading(false); } };
    const onReconnect = () => {
      if (!active) return;
      setResumeNonce((n) => n + 1);
      syncRoom();
    };

    socket.on('room:state', onRoomState);
    socket.on('connect', onReconnect);
    return () => {
      active = false;
      socket.off('room:state', onRoomState);
      socket.off('connect', onReconnect);
    };
  }, [roomCode, currentNick, socket, navigate]);

  // Leaving through the top nav (Hub, Leaderboard, profile) is an in-app route
  // change, so the socket stays connected and the server kept the seat — the
  // room stayed listed with a host who was already on the Hub. Give it up on
  // unmount; a reload can run component cleanup before the socket disconnects,
  // so mark page unloads and let the server's reconnect grace window hold the
  // seat. The 0 ms arm skips StrictMode's double-mount in dev.
  useEffect(() => {
    if (!socket || !roomCode || !currentNick) return undefined;
    let armed = false;
    const arm = setTimeout(() => { armed = true; }, 0);
    const markPageUnloading = () => { pageUnloadingRef.current = true; };
    window.addEventListener('pagehide', markPageUnloading);
    window.addEventListener('beforeunload', markPageUnloading);
    return () => {
      clearTimeout(arm);
      window.removeEventListener('pagehide', markPageUnloading);
      window.removeEventListener('beforeunload', markPageUnloading);
      if (armed && !pageUnloadingRef.current) socket.emit('room:leave', { roomCode, nickname: currentNick });
    };
  }, [socket, roomCode, currentNick]);

  useEffect(() => {
    if (
      room && ['wordscramble','trivia','tictactoe','flappy'].includes(room.gameType) &&
      room.status === 'waiting' && room.players.length === 1 &&
      (room.capacity?.max === 1 || room.isSolo) && socket
    ) socket.timeout(5000).emit('room:start', { roomCode }, (err, r) => {
      if (err) setError('Connection timed out. Please try again.');
      else if (r && !r.success) setError(r.error);
    });
  }, [room, roomCode, socket]);

  const handleStart = () => {
    if (!socket || !canStart) return;
    socket.timeout(5000).emit('room:start', { roomCode }, (err, r) => {
      if (err) setError('Connection timed out. Please try again.');
      else if (r && !r.success) setError(r.error);
    });
  };
  const handleCopy  = async () => { try { await navigator.clipboard.writeText(roomCode); } catch {} setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleLeave = () => { socket?.emit('room:leave', { roomCode, nickname: currentNick }); navigate('/hub'); };

  /* Loading */
  if (loading) return (
    <>
      <div className="page"><div className="container rstate">
        <div className="rstate-card card">
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <p className="rstate-title">Connecting to <span className="rcode">{roomCode}</span></p>
        </div>
      </div></div>
      {roomStyles}
    </>
  );

  /* Error */
  if (!room) return (
    <>
      <div className="page"><div className="container rstate">
        <div className="rstate-card card">
          <p className="rstate-title" style={{ color: 'var(--red)' }}>{error || 'Room not found'}</p>
          <Link to="/hub" className="btn btn-primary" style={{ marginTop: 'var(--s4)' }}>Back to Hub</Link>
        </div>
      </div></div>
      {roomStyles}
    </>
  );

  const gameInfo = GAMES_CATALOG.find((g) => g.id === room.gameType) || { title: room.gameType };
  const rules    = RULES[room.gameType] || { title: 'Match', detail: '' };
  const isHost   = room.hostNickname === currentNick;
  const canStart = isHost && room.players.length >= (room.capacity?.min || 1);
  const isActive = room.status === 'in_game' || room.status === 'finished';
  const awayPlayers = room.players.filter((p) => p.connected === false);

  /* Active game view */
  const gameView = (() => {
    if (room.gameType === 'snake') return <Snake onExit={handleLeave} />;
    if (room.gameType === 'wordscramble' && isActive) return <WordScramble roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'trivia'       && isActive) return <Trivia       roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'tictactoe'    && isActive) return <TicTacToe    roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'uno'          && isActive) return <Uno          roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'flappy'       && isActive) return <Flappy       roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'chess'        && isActive) return <Chess        roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'emoji'        && isActive) return <Emoji        roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'drawing'      && isActive) return <Drawing      roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    if (room.gameType === 'ludo'         && isActive) return <Ludo         roomCode={roomCode} isHost={isHost} onExit={handleLeave} />;
    return null;
  })();

  return (
    <>
      <div className="page">
        <div className="container" style={{ maxWidth: 1060 }}>

          {/* Top bar */}
          <div className="rbar">
            <div className="rbar-left">
              <div>
                <div className="rbar-game">{gameInfo.title}</div>
                <div className="rbar-player">Playing as {currentNick}</div>
              </div>
              <Badge variant={isActive ? 'success' : 'accent'}>
                {isActive ? 'Live' : 'Lobby'}
              </Badge>
            </div>
            <div className="rbar-right">
              <div className="rcode-block">
                <span className="rcode-lbl">Room</span>
                <span className="rcode">{roomCode}</span>
              </div>
              <button type="button" className={`btn ${copied ? 'btn-primary' : 'btn-secondary'} rbar-copy`} onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rconnection-error" role="status" aria-live="polite">{error}</div>
          )}

          {awayPlayers.length > 0 && (
            <div className="rreconnect-note" role="status" aria-live="polite">
              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
              <span>
                <strong>{awayPlayers.map((p) => p.nickname).join(', ')}</strong>
                {awayPlayers.length === 1 ? ' lost connection' : ' lost connection'} — holding the seat so they can rejoin…
              </span>
            </div>
          )}

          {gameView ? (
            <div className="rgame-wrapper" key={`${room.gameType}-${resumeNonce}`}>
              {gameView}

              {/* In-game Floating Chat Toggle (US-022) */}
              <button
                type="button"
                className="rchat-toggle-btn btn btn-secondary"
                onClick={() => setShowChatDrawer(prev => !prev)}
                aria-label="Toggle In-Game Room Chat"
                id="in-game-chat-toggle"
              >
                <span aria-hidden="true" className="rchat-toggle-ico">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8-8.5h.5a8.48 8.48 0 0 1 8.5 8v.5z" />
                  </svg>
                </span>
                <span>Chat</span>
              </button>

              {/* In-game Chat Drawer Modal / Popover */}
              {showChatDrawer && (
                <div className="rchat-drawer">
                  <div className="rchat-drawer-header">
                    <span className="rchat-drawer-title">
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8-8.5h.5a8.48 8.48 0 0 1 8.5 8v.5z" />
                      </svg>
                      Room Chat
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost rchat-drawer-close"
                      onClick={() => setShowChatDrawer(false)}
                      aria-label="Close Chat Drawer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="rchat-drawer-body">
                    <ChatPanel
                      socket={socket}
                      roomCode={roomCode}
                      currentNick={currentNick}
                      isVisible={true}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rlobby">

              {/* Two-column: left = players/rules/actions, right = chat */}
              <div className="rlobby-cols">
                <div className="rlobby-main">

                  {/* Players */}
                  <div className="rplayers card">
                    <div className="rplayers-head">
                      <span className="rplayers-title">
                        Players
                        <span className="rplayers-count">{room.players.length}/{room.capacity?.max || 8}</span>
                      </span>
                      <span className="rplayers-min">Min to start: {room.capacity?.min || 1}</span>
                    </div>
                    <div className="rplayers-grid">
                      {room.players.map((p, i) => (
                        <div key={p.socketId || p.nickname} className={`rplayer ${p.nickname === currentNick ? 'rplayer--you' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                          <div className="rplayer-av">
                            <Avatar nickname={p.nickname} size="md" />
                            {p.isHost && <span className="rhost-mark" title="Room Host">★</span>}
                          </div>
                          <Link to={`/profile/${encodeURIComponent(p.nickname)}`} className="rplayer-info" title="View profile">
                            <div className="rplayer-name">{p.nickname}</div>
                            <div className="rplayer-tags">
                              {p.isHost     && <span className="rtag rtag--host">Host</span>}
                              {p.nickname === currentNick && <span className="rtag rtag--you">You</span>}
                              {p.connected === false && <span className="rtag rtag--away">Away</span>}
                            </div>
                          </Link>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, (room.capacity?.max || 4) - room.players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="rplayer rplayer--empty">
                          <div className="rplayer-empty-label">Waiting...</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="rrules card">
                    <div className="rrules-title">{rules.title}</div>
                    <div className="rrules-detail">{rules.detail}</div>
                  </div>

                  {/* Actions */}
                  <div className="ractions">
                    <button type="button" className="btn btn-ghost" onClick={handleLeave}>Leave Room</button>
                    {isHost ? (
                      <button type="button" id="start-game-btn" className="btn btn-primary rstart" disabled={!canStart} onClick={handleStart}>
                        {canStart ? 'Start Game' : `Need ${room.capacity?.min} players (${room.players.length} here)`}
                      </button>
                    ) : (
                      <span className="rwaiting">
                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        Waiting for {room.hostNickname} to start
                      </span>
                    )}
                  </div>
                </div>

                {/* Chat — M9-08: only visible in lobby/waiting, not during gameplay */}
                <div className="rlobby-chat">
                  <ChatPanel
                    socket={socket}
                    roomCode={roomCode}
                    currentNick={currentNick}
                    isVisible={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {roomStyles}
    </>
  );
}

const roomStyles = (
  <style>{`
    .rstate {
      display: flex; align-items: center; justify-content: center; min-height: 60vh;
    }
    .rstate-card {
      text-align: center; padding: var(--s10) var(--s8);
      max-width: 380px; width: 100%; margin: 0 auto;
      display: flex; flex-direction: column; align-items: center; gap: var(--s3);
    }
    .rstate-title { font-size: var(--t-lg); font-weight: 700; }

    .rcode {
      font-family: 'Geist Mono', 'SF Mono', monospace;
      font-weight: 800; letter-spacing: 0.14em;
      color: var(--amber);
    }

    /* Top bar */
    .rbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--s4) var(--s6);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      margin-bottom: var(--s5);
      flex-wrap: wrap;
      gap: var(--s4);
    }
    .rbar-left { display: flex; align-items: center; gap: var(--s3); }
    .rbar-game { font-size: var(--t-xl); font-weight: 800; color: #fff; letter-spacing: -0.01em; }
    .rbar-player { font-size: var(--t-xs); color: var(--text-2); margin-top: 1px; }
    .rbar-right { display: flex; align-items: center; gap: var(--s3); }
    .rcode-block {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      padding: var(--s2) var(--s4);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }
    .rcode-lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-3); }
    .rbar-copy { padding: 8px 16px; font-size: var(--t-xs); font-weight: 700; }
    .rconnection-error {
      margin: calc(var(--s5) * -1) 0 var(--s4);
      padding: var(--s3) var(--s4);
      border: 1px solid rgba(245, 158, 11, 0.28);
      border-radius: var(--r-md);
      background: rgba(245, 158, 11, 0.08);
      color: var(--amber);
      font-size: var(--t-xs);
      font-weight: 700;
    }

    /* Lobby */
    .rlobby { display: flex; flex-direction: column; gap: var(--s4); }

    /* Two-column lobby layout */
    .rlobby-cols {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: var(--s5);
      align-items: start;
    }
    .rlobby-main { display: flex; flex-direction: column; gap: var(--s4); }
    .rlobby-chat { height: 480px; }

    /* Players section */
    .rplayers { padding: var(--s5) var(--s6); }
    .rplayers-head {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: var(--s4); margin-bottom: var(--s4);
      border-bottom: 1px solid var(--border);
    }
    .rplayers-title {
      font-size: var(--t-base); font-weight: 800; color: #fff;
      display: flex; align-items: center; gap: var(--s2);
    }
    .rplayers-count {
      font-size: var(--t-xs); font-weight: 700; color: var(--text-2);
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--r-pill); padding: 1px 8px;
    }
    .rplayers-min { font-size: var(--t-xs); color: var(--text-3); font-weight: 600; }
    .rplayers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: var(--s3);
    }
    .rplayer {
      display: flex; align-items: center; gap: var(--s3);
      padding: var(--s3) var(--s4);
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--r-lg);
      animation: fadeUp 280ms var(--ease-spring) both;
      transition: all 180ms ease;
    }
    .rplayer:hover {
      border-color: var(--border-3);
    }
    .rplayer--you {
      border-color: var(--amber);
      background: var(--amber-dim);
    }
    .rplayer--empty {
      justify-content: center; border-style: dashed;
      opacity: 0.35; padding: var(--s4);
    }
    .rplayer-empty-label { font-size: var(--t-xs); color: var(--text-3); font-weight: 600; }
    .rplayer-av { position: relative; flex-shrink: 0; }
    .rhost-mark {
      position: absolute; top: -6px; right: -6px;
      width: 18px; height: 18px; border-radius: 50%;
      background: var(--accent);
      color: #16130c;
      font-size: 10px;
      display: flex; align-items: center; justify-content: center;
      line-height: 1;
    }
    .rplayer-info { flex: 1; min-width: 0; color: inherit; text-decoration: none; cursor: pointer; }
    .rplayer-info:hover .rplayer-name { color: var(--accent-hi); }
    .rplayer-name { font-weight: 700; font-size: var(--t-sm); color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rplayer-tags { display: flex; gap: 4px; margin-top: 3px; }
    .rtag {
      font-size: 9px; font-weight: 800; padding: 2px 6px;
      border-radius: var(--r-pill); text-transform: uppercase; letter-spacing: 0.05em;
    }
    .rtag--host { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,158,11,0.3); }
    .rtag--you  { background: var(--green-dim);  color: var(--green);  border: 1px solid rgba(16,185,129,0.3); }
    .rtag--away { background: rgba(148,163,184,0.14); color: var(--text-2, #94a3b8); border: 1px solid rgba(148,163,184,0.3); }

    /* Holding a disconnected player's seat */
    .rreconnect-note {
      display: flex; align-items: center; gap: var(--s3);
      padding: var(--s3) var(--s4);
      margin-bottom: var(--s4);
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.28);
      border-radius: var(--r-md);
      color: var(--text-2);
      font-size: var(--t-xs); font-weight: 600;
      overflow-wrap: anywhere;
    }
    .rreconnect-note strong { color: var(--amber); font-weight: 800; }

    /* Rules */
    .rrules {
      padding: var(--s4) var(--s5);
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--s4); flex-wrap: wrap;
    }
    .rrules-title { font-size: var(--t-sm); font-weight: 800; color: #fff; }
    .rrules-detail { font-size: var(--t-xs); color: var(--text-2); margin-top: 2px; }

    /* Actions */
    .ractions {
      display: flex; justify-content: space-between;
      align-items: center; flex-wrap: wrap; gap: var(--s4);
    }
    .rstart { padding: 12px 32px; font-size: var(--t-base); font-weight: 800; letter-spacing: 0.02em; }
    .rwaiting {
      display: flex; align-items: center; gap: var(--s2);
      font-size: var(--t-sm); color: var(--text-2); font-weight: 600;
    }

    /* In-game Chat Toggle & Drawer (US-022) */
    .rgame-wrapper { position: relative; }
    .rchat-toggle-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 99;
      display: flex; align-items: center; gap: var(--s2);
      padding: 10px 20px; font-size: var(--t-sm); font-weight: 700;
      background: var(--surface-2);
      border: 1px solid var(--border-2);
      border-radius: var(--r-pill); cursor: pointer;
      transition: border-color 200ms ease;
    }
    .rchat-toggle-btn:hover {
      border-color: var(--border-3);
    }
    .rchat-drawer {
      position: fixed; bottom: 84px; right: 24px;
      width: 360px; height: 500px;
      max-width: calc(100vw - 32px); max-height: calc(100vh - 120px);
      background: var(--surface);
      border: 1px solid var(--border-2);
      border-radius: var(--r-lg);
      box-shadow: var(--shadow-md);
      z-index: 100; display: flex; flex-direction: column; overflow: hidden;
      animation: slideUp 240ms var(--ease-spring);
    }
    .rchat-drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--s3) var(--s4); border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }
    .rchat-drawer-title { font-weight: 800; font-size: var(--t-sm); color: #fff; }
    .rchat-drawer-close { padding: 4px 8px; font-size: var(--t-sm); min-height: unset; line-height: 1; cursor: pointer; }
    .rchat-drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }

    @media (max-width: 600px) {
      .rbar { padding: var(--s3) var(--s4); }
      .rbar-left, .rbar-right { min-width: 0; }
      .rbar-left { flex: 1 1 180px; }
      .rbar-game { font-size: var(--t-lg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .rbar-player { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .rbar-right { flex: 1 1 auto; justify-content: flex-end; }
      .rcode-block { padding-inline: var(--s3); }
      /* minmax(0, 1fr) instead of 1fr: a bare fr track cannot shrink below
         the player card's min-content width, so two long callsigns pushed the
         whole lobby 8 px past a 390 px viewport. */
      .rplayers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .rlobby-cols { grid-template-columns: minmax(0, 1fr); }
      .rlobby-main, .rlobby-chat { min-width: 0; }
      .rlobby-chat { height: 320px; }
      .ractions { flex-direction: column-reverse; align-items: stretch; }
      .rstart { width: 100%; justify-content: center; }
      .rchat-drawer { bottom: 74px; right: 12px; width: calc(100vw - 24px); height: 420px; }
    }

    @media (max-width: 380px) {
      .rbar { align-items: stretch; }
      .rbar-left, .rbar-right { flex-basis: 100%; }
      .rbar-right { justify-content: space-between; }
      .rbar-copy { flex: 1; }
    }
  `}</style>
);
