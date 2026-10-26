import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import socket from '../../socket/socket.js';
import { useAudio } from '../../context/AudioContext.jsx';
import { recordPersonalResult } from '../../utils/personalBests.js';
import './emoji.css';

/* M14 — Emoji Guessing 🤔
   The clue-giver gets the secret answer plus an emoji composer; everyone else
   gets a 60-second race to type the answer. All timing and scoring live on the
   server — this component only renders the phase it is told about. */

const PALETTE = [
  { label: 'Faces', items: ['😀', '😂', '😍', '😎', '🤔', '😱', '😭', '🤯', '🥳', '😴', '🤢', '😇'] },
  { label: 'Animals', items: ['🐶', '🐱', '🐭', '🦊', '🦁', '🐘', '🐧', '🦋', '🦈', '🐙', '🦉', '🐝'] },
  { label: 'Food', items: ['🍕', '🍔', '🍣', '🍦', '🍿', '🍩', '🍰', '🍫', '🍎', '🥑', '☕', '🍺'] },
  { label: 'Nature', items: ['🌈', '🌋', '⛈️', '❄️', '🌊', '🌙', '⭐', '☀️', '🌻', '🍂', '🌪️', '🔥'] },
  { label: 'Places', items: ['🏠', '🗼', '🗽', '🏰', '🏖️', '🏜️', '🏔️', '🌉', '🏛️', '✈️', '🚗', '🚀'] },
  { label: 'Things', items: ['⚽', '🏀', '🎸', '🎮', '📷', '📚', '💡', '🔑', '🎈', '🎁', '💎', '🕰️'] },
  { label: 'Actions', items: ['🏃', '💃', '🤸', '🥊', '🎤', '🎬', '🛌', '🍽️', '🚴', '🧗', '🤝', '💤'] },
  { label: 'Symbols', items: ['❤️', '💔', '💯', '❓', '❗', '✅', '🚫', '⚡', '💰', '👑', '🎯', '🔁'] },
];

const MAX_CLUE = 48;

function Blanks({ length }) {
  const count = Math.min(Math.max(length, 1), 26);
  return (
    <div className="emoji-blanks" aria-label={`${length} letter answer`}>
      {Array.from({ length: count }, (_, i) => <span key={i} />)}
    </div>
  );
}

function TimerBar({ remaining, total }) {
  const pct = Math.max(0, Math.min(1, remaining / total));
  const low = pct < 0.25;
  return (
    <div className={`emoji-timer ${low ? 'is-low' : ''}`}>
      <div className="emoji-timer-fill" style={{ width: `${pct * 100}%` }} />
      <span className="emoji-timer-label">{Math.ceil(remaining / 1000)}s</span>
    </div>
  );
}

export default function Emoji({ roomCode, onExit }) {
  const { nickname } = usePlayer();
  const { play } = useAudio();
  const nick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : null);

  const [state, setState] = useState(null);
  const [secret, setSecret] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [clue, setClue] = useState([]);
  const [group, setGroup] = useState(0);
  const [guess, setGuess] = useState('');
  const [feed, setFeed] = useState({ round: null, items: [] });
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const errorTimer = useRef(null);
  const feedRef = useRef(null);
  const recordedRef = useRef(false);

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
      // The broadcast is the source of truth for the round's guess feed, so a
      // player who joins mid-round still sees everything said so far.
      setFeed({ round: payload.round, items: payload.guesses || [] });
      if (payload.phase === 'clue') {
        setClue([]);
        setGuess('');
        setSent(false);
      }
    };

    const onSecret = (payload) => {
      if (payload?.roomCode !== roomCode) return;
      setSecret(payload);
    };

    const onTick = (payload) => {
      if (payload?.roomCode !== roomCode) return;
      setRemaining(payload.remainingMs || 0);
    };

    const onGuess = (payload) => {
      if (payload?.roomCode !== roomCode) return;
      setFeed((prev) => ({ round: prev.round, items: [...prev.items.slice(-24), payload] }));
      setSent(false);
    };

    socket.on('emoji:state', onState);
    socket.on('emoji:answer', onSecret);
    socket.on('emoji:tick', onTick);
    socket.on('emoji:guess', onGuess);
    socket.emit('emoji:get', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not load the game.');
    });

    return () => {
      socket.off('emoji:state', onState);
      socket.off('emoji:answer', onSecret);
      socket.off('emoji:tick', onTick);
      socket.off('emoji:guess', onGuess);
    };
  }, [roomCode, flashError]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed.items]);

  const isClueGiver = Boolean(state && state.clueGiver === nick);
  const phase = state?.phase;
  const standings = useMemo(
    () => [...(state?.scores || [])].sort((a, b) => b.score - a.score),
    [state?.scores]
  );

  useEffect(() => {
    if (state?.phase !== 'finished' || recordedRef.current) return;
    const mine = standings.find((player) => player.nickname === nick);
    if (!mine) return;
    recordedRef.current = true;
    recordPersonalResult({ gameType: 'emoji', score: mine.score || 0, won: state.winner === nick });
    play(state.winner === nick ? 'victory' : 'buzzer');
  }, [state?.phase, standings, nick, state?.winner, play]);

  const addEmoji = (emoji) => {
    setClue((prev) => {
      const next = [...prev, emoji];
      return next.join('').length > MAX_CLUE ? prev : next;
    });
  };

  const sendClue = () => {
    const text = clue.join('');
    if (!text) {
      flashError('Pick at least one emoji first.');
      return;
    }
    setSent(true);
    socket.emit('emoji:clue', { roomCode, clue: text }, (res) => {
      if (res && !res.success) {
        setSent(false);
        flashError(res.error || 'Could not send the clue.');
      }
    });
  };

  const sendGuess = (e) => {
    e?.preventDefault?.();
    const text = guess.trim();
    if (!text) return;
    setGuess('');
    socket.emit('emoji:guess', { roomCode, guess: text }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not send that guess.');
    });
  };

  const rematch = () => {
    socket.emit('emoji:rematch', { roomCode }, (res) => {
      if (res && !res.success) flashError(res.error || 'Could not start a rematch.');
    });
  };

  if (!state) {
    return (
      <div className="emoji-wrap">
        <div className="emoji-loading">
          <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
          <span>Loading the emoji deck…</span>
        </div>
      </div>
    );
  }

  const myScore = state.scores?.find((s) => s.nickname === nick)?.score || 0;
  const myVoted = state.rematchVotes?.includes(nick);
  const waitingOn = state.players?.filter((p) => !state.rematchVotes?.includes(p)) || [];

  return (
    <div className="emoji-wrap">
      <header className="emoji-head">
        <div className="emoji-head-left">
          <span className="emoji-round">Round {state.round} / {state.totalRounds}</span>
          <span className="emoji-dot" />
          <span className="emoji-phase">
            {phase === 'clue' && (isClueGiver ? 'Write your clue' : `${state.clueGiver} is writing a clue`)}
            {phase === 'guessing' && (isClueGiver ? 'They are guessing' : 'Guess the answer')}
            {phase === 'reveal' && 'Answer revealed'}
            {phase === 'finished' && 'Game over'}
          </span>
        </div>
        <div className="emoji-head-right">
          <span className="emoji-score-lbl">Your score</span>
          <span className="emoji-score-val">{myScore}</span>
        </div>
      </header>

      {(phase === 'clue' || phase === 'guessing') && (
        <TimerBar remaining={remaining} total={phase === 'clue' ? 30000 : 60000} />
      )}

      {error && <p className="emoji-error" role="alert">{error}</p>}

      <div className="emoji-stage">
        <div className="emoji-main">
          {/* ---------- clue-giver: composer ---------- */}
          {phase === 'clue' && isClueGiver && (
            <div className="emoji-compose">
              <div className="emoji-answer-card">
                <span className="emoji-answer-lbl">Your secret answer</span>
                <span className="emoji-answer-text">{secret?.answer || '…'}</span>
                <span className="emoji-answer-hint">
                  Hint: {secret?.hint} <span className="emoji-answer-cat">{secret?.category}</span>
                </span>
              </div>

              <div className="emoji-preview" aria-live="polite">
                <span className="emoji-preview-lbl">Your clue</span>
                <div className="emoji-preview-body">
                  {clue.length === 0
                    ? <span className="emoji-preview-empty">Tap emoji below to build the clue</span>
                    : clue.map((e, i) => <span key={`${e}-${i}`}>{e}</span>)}
                </div>
              </div>

              <div className="emoji-palette">
                <div className="emoji-palette-tabs">
                  {PALETTE.map((g, i) => (
                    <button
                      key={g.label}
                      type="button"
                      className={`emoji-tab ${i === group ? 'is-active' : ''}`}
                      onClick={() => setGroup(i)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="emoji-grid">
                  {PALETTE[group].items.map((e, i) => (
                    <button key={`${e}-${i}`} type="button" className="emoji-key" onClick={() => addEmoji(e)}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="emoji-compose-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setClue((p) => p.slice(0, -1))} disabled={clue.length === 0}>
                  ⌫ Undo
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setClue([])} disabled={clue.length === 0}>
                  Clear
                </button>
                <button type="button" className="btn btn-primary" onClick={sendClue} disabled={clue.length === 0 || sent}>
                  {sent ? 'Sent — wait for guesses' : 'Send clue'}
                </button>
              </div>
            </div>
          )}

          {/* ---------- guessers waiting for the clue ---------- */}
          {phase === 'clue' && !isClueGiver && (
            <div className="emoji-wait">
              <div className="emoji-write-anim" aria-hidden="true">
                <span>✍️</span>
              </div>
              <p className="emoji-wait-title">{state.clueGiver} is writing an emoji clue…</p>
              <Blanks length={state.answerLength} />
              <p className="emoji-wait-sub">
                {state.answerLength} characters{state.answerCategory ? '' : ''} · get ready
              </p>
            </div>
          )}

          {/* ---------- guessing ---------- */}
          {phase === 'guessing' && (
            <div className="emoji-guessing">
              <div className="emoji-clue-display" aria-label={`Clue from ${state.clueGiver}`}>
                <span className="emoji-clue-lbl">Clue by {state.clueGiver}</span>
                <div className="emoji-clue-body">{state.clue}</div>
              </div>

              {state.answerCategory && <span className="emoji-cat-pill">{state.answerCategory}</span>}

              <div className="emoji-feed" ref={feedRef} aria-live="polite">
                {feed.items.length === 0 && (
                  <p className="emoji-feed-empty">
                    {isClueGiver ? 'No guesses yet — sit tight.' : 'No guesses yet. Be first.'}
                  </p>
                )}
                {feed.items.map((g, i) => (
                  <div key={`${g.nickname}-${i}`} className={`emoji-feed-row ${g.correct ? 'is-correct' : ''}`}>
                    <span className="emoji-feed-name">{g.nickname}</span>
                    <span className="emoji-feed-text">{g.text}</span>
                    {g.correct && <span className="emoji-feed-tag">+{g.points}</span>}
                  </div>
                ))}
              </div>

              {!isClueGiver && (
                <form className="emoji-guess-form" onSubmit={sendGuess}>
                  <input
                    className="input-field emoji-guess-input"
                    placeholder="Type your guess…"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    maxLength={60}
                    autoFocus
                    aria-label="Your guess"
                  />
                  <button type="submit" className="btn btn-primary" disabled={!guess.trim()}>Guess</button>
                </form>
              )}

              {isClueGiver && <p className="emoji-note">Watch the feed — the first correct answer earns you 40 points.</p>}
            </div>
          )}

          {/* ---------- reveal ---------- */}
          {phase === 'reveal' && (
            <div className="emoji-reveal">
              <span className="emoji-reveal-lbl">The answer was</span>
              <div className="emoji-reveal-answer">{state.answer}</div>
              {state.roundWinner ? (
                <p className="emoji-reveal-line">
                  <strong>{state.roundWinner}</strong> got it · clue-giver earns 40
                </p>
              ) : (
                <p className="emoji-reveal-line">Nobody guessed it this round.</p>
              )}
              <p className="emoji-note">Next round starts in a moment…</p>
            </div>
          )}

          {/* ---------- finished ---------- */}
          {phase === 'finished' && (
            <div className="emoji-final">
              <span className="emoji-final-lbl">Final standings</span>
              <h3 className="emoji-final-title">
                {state.winner === nick ? 'You win' : state.winner ? `${state.winner} wins` : 'Nobody scored'}
              </h3>
              <ol className="emoji-final-list">
                {standings.map((s, i) => (
                  <li key={s.nickname} className={s.nickname === nick ? 'is-me' : ''}>
                    <span className="emoji-final-rank">{i + 1}</span>
                    <Avatar nickname={s.nickname} size="sm" />
                    <span className="emoji-final-name">{s.nickname}</span>
                    <span className="emoji-final-score">{s.score}</span>
                  </li>
                ))}
              </ol>
              <div className="emoji-final-actions">
                <button type="button" className="btn btn-primary" onClick={rematch} disabled={myVoted}>
                  {myVoted ? 'Waiting for players…' : 'Play again'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onExit}>Leave</button>
              </div>
              {myVoted && waitingOn.length > 0 && (
                <p className="emoji-note">Waiting on {waitingOn.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        {/* ---------- score rail ---------- */}
        <aside className="emoji-rail">
          <span className="emoji-rail-title">Scores</span>
          {standings.map((s) => (
            <div key={s.nickname} className={`emoji-rail-row ${s.nickname === nick ? 'is-me' : ''}`}>
              <span className="emoji-rail-name">
                {s.nickname}
                {s.nickname === state.clueGiver && phase !== 'finished' && <span className="emoji-rail-badge">clue</span>}
              </span>
              <span className="emoji-rail-score">{s.score}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
