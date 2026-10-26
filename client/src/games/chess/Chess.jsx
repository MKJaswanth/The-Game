import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import socket from '../../socket/socket.js';
import { useAudio } from '../../context/AudioContext.jsx';
import { recordPersonalResult } from '../../utils/personalBests.js';
import './chess.css';

/* M13 — Chess ♟️
   Server-authoritative rules and state; this component renders the FEN board,
   highlights the server's legal destinations and emits `chess:move` intents. */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const GLYPH = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_NAME = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };

function parseFen(fen) {
  const squares = {};
  if (!fen) return squares;
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        squares[`${FILES[file]}${8 - r}`] = {
          type: ch.toLowerCase(),
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        };
        file += 1;
      }
    }
  });
  return squares;
}

function resultText(result) {
  if (!result) return '';
  const winner = result.winner;
  switch (result.type) {
    case 'checkmate':
      return `${winner} wins by checkmate`;
    case 'resign':
      return `${winner} wins — ${result.reason}`;
    case 'abandon':
      return `${winner} wins — ${result.reason}`;
    case 'timeout':
      return `${winner} wins on time — ${result.reason}`;
    case 'stalemate':
      return 'Draw — stalemate, no legal moves';
    case 'draw':
      return `Draw — ${(result.reason || 'agreed').toLowerCase()}`;
    default:
      return result.reason || (winner ? `${winner} wins` : 'Draw');
  }
}

function MoveList({ history }) {
  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ no: i / 2 + 1, white: history[i], black: history[i + 1] || '' });
  }

  if (rows.length === 0) {
    return <p className="chess-empty">White opens. Click a piece to see its legal squares.</p>;
  }

  return (
    <ol className="chess-moves">
      {rows.map((row) => (
        <li key={row.no}>
          <span className="cm-no">{row.no}.</span>
          <span className="cm-san">{row.white}</span>
          <span className="cm-san is-black">{row.black}</span>
        </li>
      ))}
    </ol>
  );
}

function CapturedTray({ pieces, color }) {
  if (!pieces || pieces.length === 0) return <span className="chess-tray-empty">—</span>;
  return (
    <span className="chess-tray">
      {pieces.map((p, i) => (
        <span key={`${p}-${i}`} aria-label={PIECE_NAME[p]}>{GLYPH[color][p]}</span>
      ))}
    </span>
  );
}

export default function Chess({ roomCode, onExit }) {
  const { nickname } = usePlayer();
  const { play } = useAudio();
  const nick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null);

  const [state, setState] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [error, setError] = useState('');
  const [confirmResign, setConfirmResign] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const errorTimer = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const recordedRef = useRef(false);

  const flashError = useCallback((message) => {
    setError(message);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(''), 2800);
  }, []);

  useEffect(() => () => clearTimeout(errorTimer.current), []);

  useEffect(() => {
    if (state?.status !== 'in_game' || !state.turnEndsAt) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [state?.status, state?.turnEndsAt]);

  useEffect(() => {
    if (!socket || !roomCode) return undefined;

    const onState = (payload) => {
      if (payload?.roomCode !== roomCode) return;
      setState(payload);
      setClockNow(Date.now());
      setSelected(null);
      setPendingPromotion(null);
      if (payload.status === 'in_game') recordedRef.current = false;
    };

    socket.on('chess:state', onState);
    socket.emit('chess:get', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not load the game.');
    });

    return () => socket.off('chess:state', onState);
  }, [roomCode, flashError]);

  const board = useMemo(() => parseFen(state?.fen), [state?.fen]);
  const legalMoves = state?.legalMoves;
  const myColor = state ? (state.players.w === nick ? 'w' : state.players.b === nick ? 'b' : null) : null;
  const isLive = state?.status === 'in_game';
  const myTurn = Boolean(isLive && myColor && state.turn === myColor);
  const opponentColor = myColor === 'w' ? 'b' : 'w';
  const opponent = state ? (myColor === 'w' ? state.players.b : state.players.w) : '';

  const targets = useMemo(() => {
    if (!selected || !legalMoves) return [];
    return legalMoves[selected] || [];
  }, [selected, legalMoves]);

  const sendMove = useCallback(
    (from, to, promotion) => {
      socket.emit('chess:move', { roomCode, from, to, promotion }, (res) => {
        if (res && !res.success) flashError(res.error || 'Illegal move.');
        else if (res?.success) play('move');
      });
    },
    [roomCode, flashError, play]
  );

  const attemptMove = (from, to) => {
    const target = (legalMoves?.[from] || []).find((move) => move.to === to);
    if (!target) return false;
    if (target.promotion) {
      setPendingPromotion({ from, to });
      return true;
    }
    sendMove(from, to);
    setSelected(null);
    return true;
  };

  const handleSquareClick = (square) => {
    if (!state || !isLive || !myTurn) return;

    if (pendingPromotion) return;

    if (selected) {
      if (attemptMove(selected, square)) return;
    }

    const piece = board[square];
    if (piece && piece.color === myColor && state.legalMoves[square]) {
      setSelected(square === selected ? null : square);
      return;
    }
    setSelected(null);
  };

  const handlePointerDown = (event, square, piece) => {
    if (!myTurn || pendingPromotion || !piece || piece.color !== myColor || !state.legalMoves[square]) return;
    dragRef.current = { square, x: event.clientX, y: event.clientY, moved: false };
    setSelected(square);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    if (Math.hypot(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y) > 6) {
      dragRef.current.moved = true;
    }
  };

  const handlePointerUp = (square) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag.moved) {
      suppressClickRef.current = true;
      return;
    }
    suppressClickRef.current = true;
    attemptMove(drag.square, square);
  };

  useEffect(() => {
    if (state?.status !== 'finished' || recordedRef.current) return;
    const result = state.result;
    if (!result) return;
    recordedRef.current = true;
    const won = result.winner === nick;
    recordPersonalResult({ gameType: 'chess', score: won ? 100 : 0, won });
    play(won ? 'victory' : 'buzzer');
  }, [state?.status, state?.result, nick, play]);

  const offerDraw = () => {
    socket.emit('chess:draw:offer', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not offer a draw.');
    });
  };

  const answerDraw = (accept) => {
    socket.emit('chess:draw:respond', { roomCode, accept }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not answer the offer.');
    });
  };

  const resign = () => {
    setConfirmResign(false);
    socket.emit('chess:resign', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not resign.');
    });
  };

  const rematch = () => {
    socket.emit('chess:rematch', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not start a rematch.');
    });
  };

  if (!state) {
    return (
      <div className="chess-wrap">
        <div className="chess-loading">
          <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
          <span>Setting up the board…</span>
        </div>
      </div>
    );
  }

  const ranks = myColor === 'b' ? [...RANKS].reverse() : RANKS;
  const files = myColor === 'b' ? [...FILES].reverse() : FILES;
  const isCheckOnMe = state.inCheck && state.inCheck === myColor;
  const myVoted = state.rematchVotes?.includes(nick);
  const opponentVoted = state.rematchVotes?.some((n) => n !== nick);
  const offerFromMe = state.drawOffer === nick;
  const offerFromOpponent = state.drawOffer && state.drawOffer !== nick;
  const secondsLeft = state.turnEndsAt
    ? Math.max(0, Math.ceil((state.turnEndsAt - clockNow) / 1000))
    : null;
  const clockLabel = secondsLeft === null
    ? null
    : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  let statusLine = '';
  if (!isLive) statusLine = resultText(state.result);
  else if (myColor && state.turn === myColor) statusLine = isCheckOnMe ? 'You are in check — your move' : 'Your move';
  else statusLine = `${opponent} is thinking…`;

  return (
    <div className="chess-wrap">
      <div className="chess-main">
        <div className="chess-seat">
          <Avatar nickname={opponent || 'Waiting'} size="sm" />
          <div className="chess-seat-meta">
            <span className="chess-seat-name">{opponent || 'Waiting for opponent'}</span>
            <span className="chess-seat-tag">
              {opponentColor === 'w' ? 'White' : 'Black'}
              {state.turn === opponentColor && isLive ? ' · to move' : ''}
            </span>
          </div>
          <CapturedTray pieces={state.captured?.[opponentColor]} color={myColor} />
        </div>

        <div
          className={`chess-board ${myColor === 'b' ? 'is-flipped' : ''}`}
          role="grid"
          aria-label="Chess board"
        >
          {ranks.map((rank) =>
            files.map((file) => {
              const square = `${file}${rank}`;
              const piece = board[square];
              const isLight = (FILES.indexOf(file) + Number(rank)) % 2 === 1;
              const isSelected = selected === square;
              const isTarget = targets.some((t) => t.to === square);
              const isCapture = isTarget && Boolean(piece);
              const isLast = state.lastMove && (state.lastMove.from === square || state.lastMove.to === square);
              const isCheck = state.checkSquare === square;
              const label = piece ? `${PIECE_NAME[piece.type]} ${piece.color === 'w' ? 'white' : 'black'} on ${square}` : `Empty ${square}`;
              return (
                <button
                  key={square}
                  type="button"
                  role="gridcell"
                  className={[
                    'chess-sq',
                    isLight ? 'is-light' : 'is-dark',
                    isSelected ? 'is-selected' : '',
                    isLast ? 'is-last' : '',
                    isCheck ? 'is-check' : '',
                  ].filter(Boolean).join(' ')}
                   onClick={() => {
                     if (suppressClickRef.current) {
                       suppressClickRef.current = false;
                       return;
                     }
                     handleSquareClick(square);
                   }}
                   onPointerDown={(event) => handlePointerDown(event, square, piece)}
                   onPointerMove={handlePointerMove}
                   onPointerUp={() => handlePointerUp(square)}
                   onPointerCancel={() => { dragRef.current = null; }}
                  aria-label={label}
                  aria-pressed={isSelected}
                >
                  {file === files[0] && <span className="chess-rank">{rank}</span>}
                  {rank === ranks[7] && <span className="chess-file">{file}</span>}
                  {piece && (
                    <span className={`chess-piece is-${piece.color}`}>
                      {GLYPH[piece.color][piece.type]}
                    </span>
                  )}
                  {isTarget && !isCapture && <span className="chess-dot" />}
                  {isCapture && <span className="chess-capture-ring" />}
                </button>
              );
            })
          )}
        </div>

        <div className="chess-seat is-me">
          <Avatar nickname={nick || 'You'} size="sm" />
          <div className="chess-seat-meta">
            <span className="chess-seat-name">{nick}</span>
            <span className="chess-seat-tag">
              {myColor === 'w' ? 'White' : 'Black'}
              {myTurn ? ' · your turn' : ''}
            </span>
          </div>
          <CapturedTray pieces={state.captured?.[myColor]} color={opponentColor} />
        </div>
      </div>

      <aside className="chess-side">
        <div className={`chess-status ${isCheckOnMe ? 'is-check' : ''} ${!isLive ? 'is-over' : ''}`}>
          <span className="chess-status-dot" />
          <span className="chess-status-text">{statusLine}</span>
          {isLive && clockLabel && (
            <span
              className={`chess-clock ${secondsLeft <= 10 ? 'is-urgent' : ''}`}
              aria-label={`${secondsLeft} seconds remaining`}
            >
              {clockLabel}
            </span>
          )}
        </div>

        {error && <p className="chess-error" role="alert">{error}</p>}

        {offerFromOpponent && isLive && (
          <div className="chess-offer">
            <p>{state.drawOffer} offers a draw.</p>
            <div className="chess-offer-btns">
              <button type="button" className="btn btn-secondary" onClick={() => answerDraw(false)}>Decline</button>
              <button type="button" className="btn btn-primary" onClick={() => answerDraw(true)}>Accept</button>
            </div>
          </div>
        )}
        {offerFromMe && isLive && (
          <p className="chess-note">Draw offered — waiting for {opponent}.</p>
        )}

        <div className="chess-history">
          <div className="chess-panel-head">
            <span>Moves</span>
            <span className="chess-move-count">{state.moveCount}</span>
          </div>
          <MoveList history={state.history || []} />
        </div>

        {isLive ? (
          <div className="chess-actions">
            {myColor && (
              <button type="button" className="btn btn-secondary" onClick={offerDraw} disabled={offerFromMe}>
                Offer draw
              </button>
            )}
            {myColor && !confirmResign && (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmResign(true)}>Resign</button>
            )}
            {myColor && confirmResign && (
              <div className="chess-confirm">
                <span>Resign this game?</span>
                <div>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmResign(false)}>Keep playing</button>
                  <button type="button" className="btn btn-danger" onClick={resign}>Resign</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="chess-result">
            <div className="chess-result-title">
              {state.result?.winner === nick ? 'You win' : state.result?.winner ? `${state.result.winner} wins` : 'Draw'}
            </div>
            <p className="chess-result-detail">{resultText(state.result)}</p>
            <div className="chess-result-btns">
              <button type="button" className="btn btn-primary" onClick={rematch} disabled={myVoted}>
                {myVoted ? (opponentVoted ? 'Starting…' : 'Waiting for opponent…') : 'Rematch'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onExit}>Leave</button>
            </div>
            {myVoted && <p className="chess-note">Colours swap on the rematch.</p>}
          </div>
        )}
      </aside>

      {pendingPromotion && (
        <div className="chess-promo-backdrop" role="dialog" aria-label="Choose a promotion piece">
          <div className="chess-promo">
            <p>Promote to</p>
            <div className="chess-promo-grid">
              {['q', 'r', 'b', 'n'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    sendMove(pendingPromotion.from, pendingPromotion.to, type);
                    setPendingPromotion(null);
                    setSelected(null);
                  }}
                  aria-label={`Promote to ${PIECE_NAME[type]}`}
                >
                  {GLYPH[myColor][type]}
                </button>
              ))}
            </div>
            <button type="button" className="chess-promo-cancel" onClick={() => setPendingPromotion(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
