import React, { useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { recordPersonalResult } from '../../utils/personalBests.js';
import './ludo.css';

const COLORS = ['red', 'green', 'yellow', 'blue'];
const TRACK_POINTS = (() => {
  const points = [];
  for (let i = 0; i < 13; i += 1) points.push({ x: 10 + (80 * i) / 13, y: 10 });
  for (let i = 0; i < 13; i += 1) points.push({ x: 90, y: 10 + (80 * i) / 13 });
  for (let i = 0; i < 13; i += 1) points.push({ x: 90 - (80 * i) / 13, y: 90 });
  for (let i = 0; i < 13; i += 1) points.push({ x: 10, y: 90 - (80 * i) / 13 });
  return points;
})();
function pointForToken(player, progress) {
  if (progress < 0 || progress > 57) return null;
  if (progress <= 51) return TRACK_POINTS[(player.startIndex + progress) % TRACK_POINTS.length];
  const start = TRACK_POINTS[player.startIndex];
  const t = (progress - 51) / 6;
  return { x: start.x + (50 - start.x) * t, y: start.y + (50 - start.y) * t };
}

function Dice({ value }) {
  return <div className="ludo-dice" aria-label={`Dice ${value || 'not rolled'}`}>{value || '—'}</div>;
}

export default function Ludo({ roomCode, onExit }) {
  const { socket, nickname } = usePlayer();
  const { play } = useAudio();
  const nick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : '');
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const recordedRef = React.useRef(false);

  useEffect(() => {
    if (!socket || !roomCode) return undefined;
    const onState = (payload) => { if (payload?.roomCode === roomCode) setState(payload); };
    socket.on('ludo:state', onState);
    socket.emit('ludo:get', { roomCode }, (res) => { if (res && !res.success) setError(res.error || 'Could not load Ludo.'); });
    return () => socket.off('ludo:state', onState);
  }, [socket, roomCode]);

  const me = state?.players?.find((player) => player.nickname === nick);
  const isMyTurn = Boolean(me?.isTurn && state?.status === 'in_game');
  const standings = useMemo(() => [...(state?.standings || [])].sort((a, b) => (a.rank || 99) - (b.rank || 99)), [state?.standings]);

  const act = (event, payload) => {
    if (event === 'ludo:roll') play('dice');
    if (event === 'ludo:move') play('move');
    socket?.emit(event, { roomCode, ...payload }, (res) => {
      if (res && !res.success) setError(res.error || 'That move is not available.');
      else setError('');
    });
  };

  useEffect(() => {
    if (state?.status === 'in_game') {
      recordedRef.current = false;
      return;
    }
    if (state?.status !== 'finished' || recordedRef.current) return;
    const mine = state.standings?.find((player) => player.nickname === nick);
    if (!mine) return;
    recordedRef.current = true;
    recordPersonalResult({ gameType: 'ludo', score: mine.score || 0, won: state.winner === nick });
    play(state.winner === nick ? 'victory' : 'buzzer');
  }, [state?.status, state?.standings, state?.winner, nick, play]);

  const tokenClick = (player, tokenIndex) => {
    if (!player.isTurn || !player.legalTokenIds?.includes(tokenIndex)) return;
    act('ludo:move', { tokenIndex });
  };

  const renderToken = (player, tokenIndex, progress) => {
    if (progress < 0) return null;
    const point = pointForToken(player, progress);
    if (!point) return null;
    const movable = player.isTurn && player.legalTokenIds?.includes(tokenIndex);
    return (
      <button
        key={`${player.nickname}-${tokenIndex}`}
        type="button"
        className={`ludo-token ludo-token--${player.color} ${movable ? 'is-movable' : ''}`}
        style={{ left: `${point.x}%`, top: `${point.y}%` }}
        onClick={() => tokenClick(player, tokenIndex)}
        disabled={!movable}
        aria-label={`${player.nickname} token ${tokenIndex + 1}${movable ? ', movable' : ''}`}
      >
        {tokenIndex + 1}
      </button>
    );
  };

  const renderBase = (color) => {
    const player = state.players.find((entry) => entry.color === color);
    return (
      <div key={color} className={`ludo-base ludo-base--${color}`}>
        <span className="ludo-base-label mono">{color.toUpperCase()}</span>
        <div className="ludo-base-tokens">
          {(player?.tokens || []).map((progress, index) => progress < 0 ? (
            <button
              key={index}
              type="button"
              className={`ludo-token ludo-token--${color} ${player.legalTokenIds?.includes(index) ? 'is-movable' : ''}`}
              onClick={() => tokenClick(player, index)}
              disabled={!player.legalTokenIds?.includes(index)}
              aria-label={`${color} token ${index + 1} in base`}
            >
              {index + 1}
            </button>
          ) : null)}
        </div>
      </div>
    );
  };

  if (!state) return <div className="ludo-wrap"><div className="ludo-loading"><span className="spinner" /> Setting up the board…</div></div>;

  return (
    <div className="ludo-wrap">
      <header className="ludo-head">
        <div><div className="ludo-kicker mono">LUDO / BOARD RACE</div><h2>{state.status === 'finished' ? 'Match complete' : 'Bring every token home'}</h2><p>{state.lastAction}</p></div>
        <div className={`ludo-turn-chip ${isMyTurn ? 'is-me' : ''}`}><span className="mono">TURN</span><strong>{state.currentTurn || '—'}</strong></div>
      </header>
      {error && <div className="ludo-error" role="alert">{error}</div>}

      <div className="ludo-layout">
        <main className="ludo-main">
          <div className="ludo-board-shell">
            <div className="ludo-board" aria-label="Ludo board">
              {COLORS.map(renderBase)}
              {TRACK_POINTS.map((point, index) => <div key={`track-${index}`} className={`ludo-track-cell ${state.safePositions?.includes(index) ? 'is-safe' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}>{state.safePositions?.includes(index) ? '✦' : ''}</div>)}
              <div className="ludo-home-lanes"><div className="ludo-home-lane ludo-home-lane--red" /><div className="ludo-home-lane ludo-home-lane--green" /><div className="ludo-home-lane ludo-home-lane--yellow" /><div className="ludo-home-lane ludo-home-lane--blue" /><div className="ludo-center-home"><span>HOME</span></div></div>
              {state.players.map((player) => player.tokens.map((progress, index) => renderToken(player, index, progress)))}
            </div>
          </div>

          <div className="ludo-controls">
            <div className="ludo-dice-panel"><Dice value={state.dice || state.lastDice} /><div><span className="mono">{state.phase === 'move' ? 'CHOOSE A TOKEN' : state.phase === 'finished' ? 'FINAL' : isMyTurn ? 'YOUR ROLL' : `${state.currentTurn}'S ROLL`}</span><strong>{state.phase === 'move' ? `Legal tokens: ${(me?.legalTokenIds || []).map((index) => index + 1).join(', ')}` : state.phase === 'roll' ? 'Roll the server dice' : 'The board is settled'}</strong></div></div>
            {state.phase === 'roll' && <button type="button" className="btn btn-primary ludo-roll" onClick={() => act('ludo:roll')} disabled={!isMyTurn}>Roll dice</button>}
          </div>
        </main>

        <aside className="ludo-rail"><div className="ludo-rail-title mono">PLAYERS</div>{state.players.map((player) => <div key={player.nickname} className={`ludo-player ludo-player--${player.color} ${player.nickname === nick ? 'is-me' : ''} ${player.isTurn ? 'is-turn' : ''}`}><span className="ludo-color-dot" /><Avatar nickname={player.nickname} size="sm" /><span className="ludo-player-name">{player.nickname}{player.nickname === nick && <small>YOU</small>}</span><span className="ludo-home-count">{player.tokensHome}/4</span></div>)}<div className="ludo-legend"><span>✦ safe square</span><span>Base → Track → Home</span></div></aside>
      </div>

      {state.status === 'finished' && <div className="ludo-final"><div className="ludo-final-mark">♟</div><span className="mono">WINNER</span><h3>{state.winner || 'Match complete'}</h3><div className="ludo-final-list">{standings.map((player) => <div key={player.nickname} className={player.nickname === nick ? 'is-me' : ''}><span>#{player.rank}</span><Avatar nickname={player.nickname} size="sm" /><strong>{player.nickname}</strong><b>{player.score}</b></div>)}</div><div className="ludo-final-actions"><button type="button" className="btn btn-primary" onClick={() => act('ludo:rematch')} disabled={state.rematchVotes?.includes(nick)}>{state.rematchVotes?.includes(nick) ? 'Waiting for players…' : 'Play again'}</button><button type="button" className="btn btn-secondary" onClick={onExit}>Leave</button></div></div>}
    </div>
  );
}
