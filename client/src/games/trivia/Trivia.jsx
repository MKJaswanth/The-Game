import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import Avatar from '../../components/Avatar.jsx';
import Badge from '../../components/Badge.jsx';
import './trivia.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function Trivia({ roomCode, isHost, onExit }) {
  const { nickname: currentNick, socket } = usePlayer();

  const [gameState, setGameState] = useState('starting'); // starting | question_active | question_result | game_over
  const [questionData, setQuestionData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myAnswerResult, setMyAnswerResult] = useState(null);

  const [timeLeft, setTimeLeft] = useState(15);
  const [totalTime, setTotalTime] = useState(15);
  const [scores, setScores] = useState({});
  const [answeredPlayers, setAnsweredPlayers] = useState(new Set());

  // Result state
  const [resultData, setResultData] = useState(null);
  const [nextQuestionIn, setNextQuestionIn] = useState(3);

  // Game over state
  const [rankings, setRankings] = useState([]);
  const [winner, setWinner] = useState(null);

  const timerRef = useRef(null);

  // Local animated countdown during question_active
  useEffect(() => {
    if (gameState === 'question_active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft]);

  // Intermission countdown
  useEffect(() => {
    let interval = null;
    if (gameState === 'question_result' && nextQuestionIn > 0) {
      interval = setInterval(() => {
        setNextQuestionIn((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, nextQuestionIn]);

  // Wire Socket.IO events
  useEffect(() => {
    if (!socket) return;

    // trivia:starting
    const handleStarting = (data) => {
      setGameState('starting');
      setScores({});
    };

    // trivia:question
    const handleQuestion = (data) => {
      setQuestionData(data);
      setGameState('question_active');
      setSelectedOption(null);
      setHasAnswered(false);
      setMyAnswerResult(null);
      setTimeLeft(data.timeLimit || 15);
      setTotalTime(data.timeLimit || 15);
      setScores(data.scores || {});
      setAnsweredPlayers(new Set());
      setResultData(null);
    };

    // trivia:player_answered
    const handlePlayerAnswered = ({ nickname }) => {
      setAnsweredPlayers((prev) => new Set([...prev, nickname]));
    };

    // trivia:result
    const handleResult = (data) => {
      setGameState('question_result');
      setResultData(data);
      setScores(data.scores || {});
      setNextQuestionIn(data.nextQuestionIn || 3);
    };

    // trivia:end
    const handleEnd = (data) => {
      setGameState('game_over');
      setRankings(data.rankings || []);
      setWinner(data.winner || null);
      setScores(data.finalScores || {});
    };

    socket.on('trivia:starting', handleStarting);
    socket.on('trivia:question', handleQuestion);
    socket.on('trivia:player_answered', handlePlayerAnswered);
    socket.on('trivia:result', handleResult);
    socket.on('trivia:end', handleEnd);

    // Initial state check in case room already started
    socket.emit('trivia:get_state', { roomCode }, (res) => {
      if (res && res.success) {
        if (res.status === 'question_active' && res.question) {
          setQuestionData(res.question);
          setGameState('question_active');
          setTimeLeft(res.timeLeft || 15);
          setScores(res.scores || {});
        }
      }
    });

    return () => {
      socket.off('trivia:starting', handleStarting);
      socket.off('trivia:question', handleQuestion);
      socket.off('trivia:player_answered', handlePlayerAnswered);
      socket.off('trivia:result', handleResult);
      socket.off('trivia:end', handleEnd);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [socket, roomCode]);

  // Submit Answer
  const handleSelectOption = (index) => {
    if (gameState !== 'question_active' || hasAnswered || !socket) return;

    setSelectedOption(index);
    setHasAnswered(true);

    socket.emit(
      'trivia:answer',
      {
        roomCode,
        nickname: currentNick,
        answerIndex: index
      },
      (res) => {
        if (res && res.success) {
          setMyAnswerResult(res);
        }
      }
    );
  };

  // Keyboard shortcut listener for options (1-4 or A-D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'question_active' || hasAnswered) return;

      const key = e.key.toUpperCase();
      if (key === '1' || key === 'A') handleSelectOption(0);
      else if (key === '2' || key === 'B') handleSelectOption(1);
      else if (key === '3' || key === 'C') handleSelectOption(2);
      else if (key === '4' || key === 'D') handleSelectOption(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, hasAnswered, socket, roomCode, currentNick]);

  const handleRestart = () => {
    if (!socket || !isHost) return;
    socket.emit('trivia:restart', { roomCode });
  };

  // Stepper calculations
  const questionNumber = questionData?.questionNumber || 1;
  const totalQuestions = questionData?.totalQuestions || 10;
  const questionsLeft = Math.max(0, totalQuestions - questionNumber);
  const isFinalQuestion = questionNumber === totalQuestions;
  const isUrgent = timeLeft <= 5 && gameState === 'question_active';
  const timerPercent = Math.max(0, (timeLeft / (totalTime || 15)) * 100);

  return (
    <div className="trivia-container">
      {/* HEADER & ROUND STEPPER */}
      <div className="trivia-header-card card">
        <div className="trivia-meta">
          <span style={{ fontSize: '1.75rem' }}>🧠</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>
                Question {questionNumber} of {totalQuestions}
              </h2>
              {questionData?.category && (
                <Badge variant="accent" style={{ fontSize: '10px' }}>
                  {questionData.category}
                </Badge>
              )}
              {isFinalQuestion ? (
                <Badge variant="warning" style={{ fontWeight: 800 }}>
                  🔥 FINAL QUESTION
                </Badge>
              ) : (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  ({questionsLeft} {questionsLeft === 1 ? 'question' : 'questions'} left)
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
              {isFinalQuestion
                ? 'Game concludes after this question!'
                : `Match ends automatically after Question ${totalQuestions}`}
            </div>
          </div>
        </div>

        {/* 15s Countdown Timer */}
        <div className={`trivia-timer-badge ${isUrgent ? 'urgent' : ''}`}>
          <span>⏱️</span>
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* 10-Step Visual Progress Stepper */}
      <div className="trivia-stepper-wrap">
        <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', fontWeight: 700, marginRight: '4px' }}>
          QUESTIONS:
        </span>
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => {
          const isDone = q < questionNumber;
          const isCurrent = q === questionNumber;
          const isLast = q === totalQuestions;

          let stepClass = 'trivia-step-dot';
          if (isDone) stepClass += ' completed';
          if (isCurrent) stepClass += ' active';
          if (isLast) stepClass += ' final';

          return (
            <div
              key={q}
              className={stepClass}
              title={`Question ${q} of ${totalQuestions}${isLast ? ' (Final Question)' : ''}`}
            >
              {isDone ? '✓' : q}
            </div>
          );
        })}
      </div>

      {/* Timer Bar */}
      <div className="trivia-timer-bar-wrap">
        <div
          className="trivia-timer-bar"
          style={{
            width: `${timerPercent}%`,
            backgroundColor: isUrgent ? 'var(--color-danger)' : 'var(--color-accent)'
          }}
        />
      </div>

      {/* STARTING STATE */}
      {gameState === 'starting' && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⏳</div>
          <h3>Preparing 10 Quiz Questions...</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
            Syncing trivia engine with server
          </p>
        </div>
      )}

      {/* QUESTION ACTIVE STATE */}
      {gameState === 'question_active' && questionData && (
        <div className="trivia-question-card card">
          <div className="trivia-question-category">
            <span>🏷️</span>
            <span>{questionData.category} • {questionData.difficulty?.toUpperCase()}</span>
          </div>

          <h3 className="trivia-question-text">
            {questionData.question}
          </h3>

          {/* 4 Choices Grid */}
          <div className="trivia-options-grid">
            {questionData.options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              const isDimmed = hasAnswered && !isSelected;

              return (
                <button
                  key={idx}
                  type="button"
                  id={`trivia-option-${idx}`}
                  className={`trivia-option-btn ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`}
                  onClick={() => handleSelectOption(idx)}
                  disabled={hasAnswered}
                >
                  <span className="trivia-option-letter">{OPTION_LETTERS[idx]}</span>
                  <span style={{ flex: 1 }}>{optionText}</span>
                  {isSelected && <span>🔒</span>}
                </button>
              );
            })}
          </div>

          {/* Feedback status banner */}
          {hasAnswered ? (
            <div className="trivia-status-banner waiting">
              <span>🔒 Answer locked in!</span>
              <span>Waiting for opponents or timer to complete...</span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>
              Tip: Click an option or press 1, 2, 3, or 4 on your keyboard. Speed bonuses awarded for fast answers!
            </div>
          )}
        </div>
      )}

      {/* QUESTION RESULT / INTERMISSION STATE */}
      {gameState === 'question_result' && resultData && (
        <div className="trivia-intermission-card card">
          <span style={{ fontSize: '2.5rem' }}>✨</span>
          <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Question {questionNumber} Result
          </h4>

          <div style={{ margin: 'var(--space-3) 0' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block' }}>
              CORRECT ANSWER:
            </span>
            <div className="trivia-intermission-answer">
              {OPTION_LETTERS[resultData.correctIndex]}. {resultData.correctAnswer}
            </div>
          </div>

          {/* Explanation if available */}
          {resultData.explanation && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', maxWidth: '600px', margin: '0 auto var(--space-4)' }}>
              💡 {resultData.explanation}
            </p>
          )}

          {/* Player Result Chip */}
          {selectedOption !== null && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              {selectedOption === resultData.correctIndex ? (
                <Badge variant="success" style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }}>
                  🎉 Correct! {myAnswerResult?.points ? `+${myAnswerResult.points} pts (Speed bonus: +${myAnswerResult.speedBonus || 0})` : '+100 pts'}
                </Badge>
              ) : (
                <Badge variant="danger" style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }}>
                  ✗ Incorrect (0 pts)
                </Badge>
              )}
            </div>
          )}

          {/* Intermission round progression */}
          <div style={{ marginTop: 'var(--space-4)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {questionNumber < totalQuestions
                ? `Question ${questionNumber} of ${totalQuestions} complete • ${questionsLeft} ${questionsLeft === 1 ? 'question' : 'questions'} remaining until match ends!`
                : 'Final Question complete! Calculating final podium scores...'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {questionNumber < totalQuestions ? 'Next question in:' : 'Results in:'}
              </span>
              <strong style={{ color: 'var(--color-accent-light)', fontSize: 'var(--font-size-base)' }}>
                {nextQuestionIn}s
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER STATE */}
      {gameState === 'game_over' && (
        <div className="trivia-gameover-card card">
          <div className="trivia-trophy">🏆</div>
          <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            Trivia Match Concluded!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
            Champion:{' '}
            <strong style={{ color: 'var(--color-accent-light)', fontSize: 'var(--font-size-lg)' }}>
              {winner?.nickname || 'Everyone'}
            </strong>{' '}
            with {winner?.score || 0} points! 🎉
          </p>

          <table className="trivia-rankings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => (
                <tr key={player.nickname} style={{ background: index === 0 ? 'rgba(245, 158, 11, 0.08)' : 'transparent' }}>
                  <td>
                    {index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `${index + 1}th`}
                  </td>
                  <td>
                    <strong style={{ color: player.nickname === currentNick ? 'var(--color-accent-light)' : '#fff' }}>
                      {player.nickname} {player.nickname === currentNick ? '(You)' : ''}
                    </strong>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-accent-light)', fontWeight: 800 }}>
                    {player.score} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
            {isHost && (
              <button
                type="button"
                id="trivia-restart-btn"
                className="btn btn-primary"
                onClick={handleRestart}
              >
                🔄 Play Again
              </button>
            )}
            <button
              type="button"
              id="trivia-exit-btn"
              className="btn btn-secondary"
              onClick={onExit}
            >
              ← Back to Game Hub
            </button>
          </div>
        </div>
      )}

      {/* LIVE ROOM LEADERBOARD ROW */}
      <div className="trivia-scoreboard-card card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <h4 style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)' }}>
            LIVE ROOM SCOREBOARD
          </h4>
          <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
            {Object.keys(scores).length} {Object.keys(scores).length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        <div className="trivia-scoreboard-list">
          {Object.entries(scores)
            .sort(([, a], [, b]) => b - a)
            .map(([nick, score], idx) => {
              const isYou = nick === currentNick;
              const hasSubmitted = answeredPlayers.has(nick);

              return (
                <div
                  key={nick}
                  className={`trivia-player-chip ${hasSubmitted ? 'answered' : ''} ${isYou ? 'is-you' : ''}`}
                >
                  <Avatar nickname={nick} size="sm" />
                  <span>
                    {nick} {isYou ? '(You)' : ''}
                  </span>
                  <strong style={{ color: 'var(--color-accent-light)' }}>{score}</strong>
                  {gameState === 'question_active' && (
                    <span style={{ fontSize: '10px' }} title={hasSubmitted ? 'Answered' : 'Thinking...'}>
                      {hasSubmitted ? '✓' : '🤔'}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
