import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { recordPersonalResult } from '../../utils/personalBests.js';
import './drawing.css';

const COLORS = ['#ffffff', '#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#fb7185', '#111827'];
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

function normalizePoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  };
}

function drawStroke(ctx, stroke) {
  if (!stroke?.from || !stroke?.to) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(stroke.from.x * CANVAS_WIDTH, stroke.from.y * CANVAS_HEIGHT);
  ctx.lineTo(stroke.to.x * CANVAS_WIDTH, stroke.to.y * CANVAS_HEIGHT);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size || 5;
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#11151f' : stroke.color || '#ffffff';
  ctx.stroke();
  ctx.restore();
}

function Blanks({ length }) {
  const count = Math.min(Math.max(Number(length) || 1, 1), 24);
  return (
    <div className="drawing-blanks" aria-label={`${length} letter answer`}>
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  );
}

function TimerBar({ remaining, total }) {
  const pct = Math.max(0, Math.min(1, remaining / total));
  return (
    <div className={`drawing-timer ${pct < 0.25 ? 'is-low' : ''}`}>
      <div className="drawing-timer-fill" style={{ width: `${pct * 100}%` }} />
      <span className="drawing-timer-label mono">{Math.ceil(remaining / 1000)}s</span>
    </div>
  );
}

export default function Drawing({ roomCode, onExit }) {
  const { socket, nickname } = usePlayer();
  const { play } = useAudio();
  const nick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : '');
  const canvasRef = useRef(null);
  const drawingRef = useRef(null);
  const errorTimer = useRef(null);
  const recordedRef = useRef(false);

  const [state, setState] = useState(null);
  const [secret, setSecret] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [guess, setGuess] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState('brush');
  const [error, setError] = useState('');

  const flashError = useCallback((message) => {
    setError(message);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(''), 2800);
  }, []);

  useEffect(() => () => clearTimeout(errorTimer.current), []);

  useEffect(() => {
    if (!socket || !roomCode) return undefined;

    const onState = (payload) => {
      if (payload?.roomCode !== roomCode) return;
      setState(payload);
      setRemaining(payload.remainingMs || 0);
      if (payload.phase !== 'finished') recordedRef.current = false;
    };
    const onWord = (payload) => {
      if (payload?.roomCode === roomCode) setSecret(payload);
    };
    const onTick = (payload) => {
      if (payload?.roomCode === roomCode) setRemaining(payload.remainingMs || 0);
    };
    const onStroke = (stroke) => setState((prev) => prev ? { ...prev, strokes: [...(prev.strokes || []), stroke] } : prev);
    const onClear = () => setState((prev) => prev ? { ...prev, strokes: [] } : prev);
    const onGuess = (entry) => setState((prev) => prev ? { ...prev, guesses: [...(prev.guesses || []), entry] } : prev);

    socket.on('drawing:state', onState);
    socket.on('drawing:word', onWord);
    socket.on('drawing:tick', onTick);
    socket.on('drawing:stroke', onStroke);
    socket.on('drawing:clear', onClear);
    socket.on('drawing:guess', onGuess);
    socket.emit('drawing:get', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not load the drawing game.');
    });

    return () => {
      socket.off('drawing:state', onState);
      socket.off('drawing:word', onWord);
      socket.off('drawing:tick', onTick);
      socket.off('drawing:stroke', onStroke);
      socket.off('drawing:clear', onClear);
      socket.off('drawing:guess', onGuess);
    };
  }, [socket, roomCode, flashError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#11151f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    (state?.strokes || []).forEach((stroke) => drawStroke(ctx, stroke));
  }, [state?.strokes]);

  const phase = state?.phase;
  const isDrawer = Boolean(state && phase === 'drawing' && state.drawer === nick);
  const isFinished = phase === 'finished';
  const standings = useMemo(() => [...(state?.scores || [])].sort((a, b) => b.score - a.score), [state?.scores]);
  const myScore = standings.find((player) => player.nickname === nick)?.score || 0;
  const remainingSeconds = Math.ceil(remaining / 1000);

  useEffect(() => {
    if (!isFinished || recordedRef.current) return;
    const mine = standings.find((player) => player.nickname === nick);
    if (!mine) return;
    recordedRef.current = true;
    recordPersonalResult({ gameType: 'drawing', score: mine.score || 0, won: state.winner === nick });
    play(state.winner === nick ? 'victory' : 'buzzer');
  }, [isFinished, standings, nick, state?.winner, play]);

  const sendStroke = (from, to) => {
    if (!socket || !isDrawer) return;
    const stroke = { from, to, color, size, tool };
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawStroke(ctx, stroke);
    socket.emit('drawing:stroke', { roomCode, stroke }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not draw that stroke.');
    });
  };

  const onPointerDown = (event) => {
    if (!isDrawer || !canvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = normalizePoint(event, canvasRef.current);
  };

  const onPointerMove = (event) => {
    if (!drawingRef.current || !isDrawer || !canvasRef.current) return;
    const next = normalizePoint(event, canvasRef.current);
    sendStroke(drawingRef.current, next);
    drawingRef.current = next;
  };

  const endPointer = () => { drawingRef.current = null; };

  const clearCanvas = () => {
    socket?.emit('drawing:clear', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not clear the canvas.');
    });
  };

  const submitGuess = (event) => {
    event.preventDefault();
    const text = guess.trim();
    if (!text || !socket) return;
    setGuess('');
    socket.emit('drawing:guess', { roomCode, guess: text }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not submit that guess.');
    });
  };

  const rematch = () => {
    socket?.emit('drawing:rematch', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not start a rematch.');
    });
  };

  if (!state) {
    return <div className="drawing-wrap"><div className="drawing-loading"><span className="spinner" /> Loading the drawing table…</div></div>;
  }

  return (
    <div className="drawing-wrap">
      <header className="drawing-head">
        <div>
          <div className="drawing-kicker mono">DRAW & GUESS</div>
          <div className="drawing-title-row">
            <h2>Round {state.round} <span>/ {state.totalRounds}</span></h2>
            <span className={`drawing-phase ${isDrawer ? 'is-drawer' : ''}`}>
              {isFinished ? 'FINAL STANDINGS' : isDrawer ? 'YOU ARE DRAWING' : `${state.drawer} IS DRAWING`}
            </span>
          </div>
        </div>
        <div className="drawing-score-block"><span className="mono">YOUR SCORE</span><strong>{myScore}</strong></div>
      </header>

      {(phase === 'drawing' || phase === 'reveal') && <TimerBar remaining={remaining} total={phase === 'drawing' ? 80000 : 5000} />}
      {error && <div className="drawing-error" role="alert">{error}</div>}

      <div className="drawing-layout">
        <main className="drawing-main">
          <div className={`drawing-canvas-frame ${isDrawer ? 'is-drawer' : ''}`}>
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              aria-label={isDrawer ? 'Shared drawing canvas' : 'Shared drawing preview'}
            />
            <div className="drawing-canvas-label mono">
              {isDrawer ? `SECRET: ${secret?.word || '…'}` : <><Blanks length={state.wordLength} /> <span>{state.category || 'GUESS THE WORD'}</span></>}
            </div>
          </div>

          {isDrawer && phase === 'drawing' && (
            <div className="drawing-toolbar" aria-label="Drawing tools">
              <div className="drawing-tool-group">
                {COLORS.map((option) => (
                  <button key={option} type="button" className={`drawing-color ${color === option ? 'is-selected' : ''}`} style={{ background: option }} onClick={() => { setColor(option); setTool('brush'); }} aria-label={`Use ${option} brush`} />
                ))}
              </div>
              <label className="drawing-size mono">SIZE <input type="range" min="2" max="28" value={size} onChange={(event) => setSize(Number(event.target.value))} /> <span>{size}</span></label>
              <button type="button" className={`drawing-tool-btn ${tool === 'eraser' ? 'is-active' : ''}`} onClick={() => setTool(tool === 'eraser' ? 'brush' : 'eraser')}>{tool === 'eraser' ? 'Brush' : 'Eraser'}</button>
              <button type="button" className="drawing-tool-btn" onClick={clearCanvas}>Clear</button>
            </div>
          )}

          {phase === 'drawing' && !isDrawer && (
            <form className="drawing-guess-form" onSubmit={submitGuess}>
              <input className="input-field" value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="What is the drawing?" maxLength={60} autoFocus aria-label="Your drawing guess" />
              <button type="submit" className="btn btn-primary" disabled={!guess.trim()}>Guess</button>
            </form>
          )}

          {phase === 'drawing' && (
            <div className="drawing-feed" aria-live="polite">
              {(state.guesses || []).length === 0 && <span className="drawing-feed-empty">Guesses will appear here for everyone.</span>}
              {(state.guesses || []).slice(-8).map((entry, index) => (
                <div key={`${entry.nickname}-${index}`} className={`drawing-feed-row ${entry.correct ? 'is-correct' : ''}`}>
                  <strong>{entry.nickname}</strong><span>{entry.text}</span>{entry.correct && <b>+{state.roundPoints?.points || '✓'}</b>}
                </div>
              ))}
            </div>
          )}

          {phase === 'reveal' && (
            <div className="drawing-reveal-card">
              <span className="mono">THE WORD WAS</span>
              <strong>{state.answer}</strong>
              <p>{state.roundWinner ? `${state.roundWinner} solved it in time.` : 'Nobody solved this round.'}</p>
              <small>Next round in {remainingSeconds}s</small>
            </div>
          )}

          {isFinished && (
            <div className="drawing-final-card">
              <div className="drawing-final-mark">✦</div>
              <span className="mono">MATCH COMPLETE</span>
              <h3>{state.winner ? `${state.winner} wins` : 'No winner this time'}</h3>
              <div className="drawing-final-list">
                {(state.standings || standings).map((player) => <div key={player.nickname} className={player.nickname === nick ? 'is-me' : ''}><span>#{player.rank}</span><Avatar nickname={player.nickname} size="sm" /><strong>{player.nickname}</strong><b>{player.score}</b></div>)}
              </div>
              <div className="drawing-final-actions"><button type="button" className="btn btn-primary" onClick={rematch} disabled={state.rematchVotes?.includes(nick)}>{state.rematchVotes?.includes(nick) ? 'Waiting for players…' : 'Play again'}</button><button type="button" className="btn btn-secondary" onClick={onExit}>Leave</button></div>
            </div>
          )}
        </main>

        <aside className="drawing-rail">
          <div className="drawing-rail-title mono">SCOREBOARD</div>
          {(state.scores || standings).map((player, index) => <div key={player.nickname} className={`drawing-player ${player.nickname === nick ? 'is-me' : ''}`}><span className="drawing-player-rank mono">{String(index + 1).padStart(2, '0')}</span><Avatar nickname={player.nickname} size="sm" /><span className="drawing-player-name">{player.nickname}{player.nickname === state.drawer && phase === 'drawing' && <small>DRAWING</small>}</span><b>{player.score}</b></div>)}
        </aside>
      </div>
    </div>
  );
}
