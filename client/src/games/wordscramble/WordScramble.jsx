import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import Badge from '../../components/Badge.jsx';
import './wordscramble.css';

export default function WordScramble({ roomCode, isHost, onExit }) {
  const { socket, nickname } = usePlayer();
  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : '');

  // Game state
  const [gameState, setGameState] = useState('waiting'); // 'waiting' | 'round_active' | 'round_result' | 'game_over'
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(10);
  const [scrambled, setScrambled] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalTime, setTotalTime] = useState(30);
  const [scores, setScores] = useState({});
  const [roundGuesses, setRoundGuesses] = useState({});

  // Input & guess state
  const [guessInput, setGuessInput] = useState('');
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'waiting', message: string, points?: number }
  const [isShaking, setIsShaking] = useState(false);

  // Round result state
  const [revealedWord, setRevealedWord] = useState('');
  const [nextRoundIn, setNextRoundIn] = useState(4);

  // Game over state
  const [rankings, setRankings] = useState([]);
  const [winner, setWinner] = useState(null);

  const inputRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Sync game state from server on mount
  useEffect(() => {
    if (!socket || !roomCode) return;

    socket.emit('scramble:get_state', { roomCode }, (res) => {
      if (res && res.success) {
        setRound(res.round);
        setTotalRounds(res.totalRounds);
        setScrambled(res.scrambled);
        setCategory(res.category);
        setDifficulty(res.difficulty);
        setTimeLeft(res.timeLimit);
        setTotalTime(30);
        setScores(res.scores || {});
        setRoundGuesses(res.roundGuesses || {});
        setGameState(res.status || 'round_active');

        if (res.roundGuesses && res.roundGuesses[currentNick]) {
          setHasGuessedCorrectly(true);
          setFeedback({
            type: 'success',
            message: `Guessed correctly! +${res.roundGuesses[currentNick].points} pts`
          });
        }
      }
    });

    // Listen to new round
    function handleScrambleRound(data) {
      setRound(data.round);
      setTotalRounds(data.totalRounds);
      setScrambled(data.scrambled);
      setCategory(data.category);
      setDifficulty(data.difficulty);
      setTimeLeft(data.timeLimit);
      setTotalTime(data.timeLimit);
      setScores(data.scores || {});
      setRoundGuesses({});
      setHasGuessedCorrectly(false);
      setGuessInput('');
      setFeedback(null);
      setRevealedWord('');
      setGameState('round_active');

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }

    // Listen to another player guessing correctly
    function handlePlayerCorrect(data) {
      setScores(data.scores || {});
      setRoundGuesses((prev) => ({
        ...prev,
        [data.nickname]: {
          points: data.points,
          secondsTaken: data.secondsTaken
        }
      }));
    }

    // Listen to round results
    function handleScrambleResult(data) {
      setGameState('round_result');
      setRevealedWord(data.correctWord);
      setScores(data.scores || {});
      setRoundGuesses(data.roundGuesses || {});
      setNextRoundIn(data.nextRoundIn || 4);
    }

    // Listen to game end
    function handleScrambleEnd(data) {
      setGameState('game_over');
      setRankings(data.rankings || []);
      setWinner(data.winner || null);
      setScores(data.finalScores || {});
    }

    socket.on('scramble:round', handleScrambleRound);
    socket.on('scramble:player_correct', handlePlayerCorrect);
    socket.on('scramble:result', handleScrambleResult);
    socket.on('scramble:end', handleScrambleEnd);

    return () => {
      socket.off('scramble:round', handleScrambleRound);
      socket.off('scramble:player_correct', handlePlayerCorrect);
      socket.off('scramble:result', handleScrambleResult);
      socket.off('scramble:end', handleScrambleEnd);
    };
  }, [socket, roomCode, currentNick]);

  // Local 1-second countdown timer during round_active
  useEffect(() => {
    if (gameState !== 'round_active') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState, round]);

  // Intermission countdown
  useEffect(() => {
    if (gameState !== 'round_result') return;

    const interval = setInterval(() => {
      setNextRoundIn((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Handle guess submission
  const handleSubmitGuess = (e) => {
    e.preventDefault();
    if (!socket || !guessInput.trim() || hasGuessedCorrectly || gameState !== 'round_active') {
      return;
    }

    const trimmed = guessInput.trim();

    socket.emit(
      'scramble:guess',
      { roomCode, nickname: currentNick, guess: trimmed },
      (res) => {
        if (res && res.correct) {
          setHasGuessedCorrectly(true);
          setFeedback({
            type: 'success',
            message: `🎉 Correct! +${res.points} pts (Speed Bonus: +${res.speedBonus} pts)`
          });
        } else {
          setIsShaking(true);
          setFeedback({
            type: 'error',
            message: '❌ Not quite! Keep trying...'
          });
          setTimeout(() => setIsShaking(false), 500);
        }
      }
    );
  };

  // Host restarts game
  const handleRestart = () => {
    if (!socket || !isHost) return;
    socket.emit('scramble:restart', { roomCode });
  };

  // Letter tiles from scrambled string
  const letterTiles = scrambled.split('');
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const isUrgent = timeLeft <= 7;

  return (
    <div className="scramble-container">
      {/* Header bar: Round, Category, and Live Countdown */}
      <div className="scramble-header">
        <div className="scramble-round-info">
          <span style={{ fontSize: '1.4rem' }}>🔤</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="scramble-round-pill">
                Round {round} / {totalRounds}
              </span>
              <Badge variant={difficulty === 'easy' ? 'success' : difficulty === 'medium' ? 'accent' : 'warning'}>
                {difficulty.toUpperCase()}
              </Badge>
              {round === totalRounds ? (
                <Badge variant="warning" style={{ fontWeight: 800 }}>
                  🔥 FINAL ROUND
                </Badge>
              ) : (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  ({totalRounds - round} {totalRounds - round === 1 ? 'round' : 'rounds'} left)
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
              {round === totalRounds ? 'Game concludes after this word!' : `Match ends automatically after Round ${totalRounds}`}
            </div>
          </div>
        </div>

        <div className="scramble-timer-container">
          <div className={`scramble-timer-badge ${isUrgent ? 'urgent' : ''}`}>
            <span>⏱️</span>
            <span>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* 10-Step Visual Round Stepper */}
      <div className="scramble-stepper-wrap">
        <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', fontWeight: 700, marginRight: '4px' }}>
          ROUNDS:
        </span>
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
          const isDone = r < round;
          const isCurrent = r === round;
          const isLast = r === totalRounds;

          let stepClass = 'scramble-step-dot';
          if (isDone) stepClass += ' completed';
          if (isCurrent) stepClass += ' active';
          if (isLast) stepClass += ' final';

          return (
            <div
              key={r}
              className={stepClass}
              title={`Round ${r} of ${totalRounds}${isLast ? ' (Final Round)' : ''}`}
            >
              {isDone ? '✓' : r}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="scramble-timer-bar-wrap">
        <div
          className={`scramble-timer-bar ${isUrgent ? 'urgent' : ''}`}
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* ACTIVE ROUND STATE */}
      {gameState === 'round_active' && (
        <div className="scramble-play-card card">
          {category && (
            <div className="scramble-category-badge">
              Category: {category} • {scrambled.length} letters
            </div>
          )}

          <h2 style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            Unscramble the letters to reveal the word:
          </h2>

          {/* Letter Tiles */}
          <div className="scramble-tiles-row">
            {letterTiles.map((letter, index) => (
              <div
                key={`${letter}-${index}`}
                className="scramble-letter-tile"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Guess Input Form */}
          <form onSubmit={handleSubmitGuess} className="scramble-form">
            <input
              ref={inputRef}
              type="text"
              id="scramble-guess-input"
              className={`scramble-input ${isShaking ? 'shake' : ''}`}
              placeholder="TYPE YOUR GUESS..."
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value.toUpperCase())}
              disabled={hasGuessedCorrectly}
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              id="scramble-submit-btn"
              className="btn btn-primary"
              disabled={hasGuessedCorrectly || !guessInput.trim()}
              style={{ padding: '0 24px', fontWeight: 700 }}
            >
              Submit ↵
            </button>
          </form>

          {/* Feedback Message */}
          <div className="scramble-feedback">
            {feedback && (
              <div className={`scramble-feedback ${feedback.type}`}>
                {feedback.message}
              </div>
            )}
            {hasGuessedCorrectly && (
              <div className="scramble-feedback waiting">
                ⏳ Waiting for teammates or timer to finish...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROUND RESULT / INTERMISSION STATE */}
      {gameState === 'round_result' && (
        <div className="scramble-intermission-card card">
          <span style={{ fontSize: '2rem' }}>✨</span>
          <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
            The word was:
          </h3>
          <div className="scramble-reveal-word">{revealedWord}</div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', marginBottom: 'var(--space-2)' }}>
              SOLVED BY:
            </h4>
            <div className="scramble-solvers-list">
              {Object.keys(roundGuesses).length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  No one unscrambled it in time! ⌛
                </div>
              ) : (
                Object.entries(roundGuesses).map(([solver, info]) => (
                  <div key={solver} className="scramble-solver-chip">
                    <span>⚡</span>
                    <span>{solver}</span>
                    <span style={{ opacity: 0.8 }}>({info.secondsTaken}s)</span>
                    <strong style={{ color: '#fff' }}>+{info.points} pts</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {round < totalRounds
                ? `Round ${round} of ${totalRounds} complete • ${totalRounds - round} ${totalRounds - round === 1 ? 'round' : 'rounds'} remaining until game ends!`
                : 'Final Round complete! Calculating final scores...'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {round < totalRounds ? 'Next round in:' : 'Results in:'}
              </span>
              <strong style={{ color: 'var(--color-accent-light)', fontSize: 'var(--font-size-base)' }}>
                {nextRoundIn}s
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER STATE */}
      {gameState === 'game_over' && (
        <div className="scramble-gameover-card card">
          <div className="scramble-trophy">🏆</div>
          <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            Game Over!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
            Winner:{' '}
            <strong style={{ color: 'var(--color-accent-light)', fontSize: 'var(--font-size-lg)' }}>
              {winner?.nickname || 'Everyone'}
            </strong>{' '}
            with {winner?.score || 0} points! 🎉
          </p>

          <table className="scramble-rankings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((rankPlayer, idx) => (
                <tr key={rankPlayer.nickname}>
                  <td>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </td>
                  <td>
                    <strong>{rankPlayer.nickname}</strong>
                    {rankPlayer.nickname === currentNick && (
                      <Badge variant="accent" style={{ marginLeft: '8px', fontSize: '10px' }}>
                        YOU
                      </Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className="scramble-score-num">
                    {rankPlayer.score} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
            {isHost && (
              <button
                type="button"
                id="scramble-play-again-btn"
                className="btn btn-primary"
                onClick={handleRestart}
              >
                🔄 Play Again
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onExit}
            >
              ← Back to Hub
            </button>
          </div>
        </div>
      )}

      {/* Real-time Room Leaderboard */}
      <div className="scramble-scoreboard-card card">
        <div className="scramble-scoreboard-header">
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            ROOM LEADERBOARD
          </h4>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
            {Object.keys(scores).length} players
          </span>
        </div>

        <div className="scramble-scores-grid">
          {Object.entries(scores)
            .sort(([, a], [, b]) => b - a)
            .map(([playerNick, score]) => {
              const solvedThisRound = Boolean(roundGuesses[playerNick]);
              const isMe = playerNick === currentNick;

              return (
                <div
                  key={playerNick}
                  className={`scramble-player-score-item ${isMe ? 'is-me' : ''} ${solvedThisRound ? 'solved' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Avatar nickname={playerNick} size="sm" />
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                        {playerNick} {isMe && '(You)'}
                      </div>
                      <div style={{ fontSize: '10px', color: solvedThisRound ? '#34d399' : 'var(--color-text-dim)' }}>
                        {solvedThisRound ? 'Solved ✓' : 'Guessing...'}
                      </div>
                    </div>
                  </div>
                  <div className="scramble-score-num" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {score}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
