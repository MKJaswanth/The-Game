import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { SERVER_URL } from '../../socket/socket.js';
import './snake.css';

const GRID_SIZE = 20; // 20x20 cells
const CANVAS_DIM = 400; // 400x400 internal resolution
const CELL_SIZE = CANVAS_DIM / GRID_SIZE;
const INITIAL_SPEED = 140; // ms per tick

const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
];

export default function Snake({ onExit }) {
  const { nickname } = usePlayer();
  const canvasRef = useRef(null);

  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState({ x: 15, y: 10 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake_high_score') || '0', 10);
  });
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'playing' | 'paused' | 'gameover'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Refs for loop to avoid closure staleness
  const directionRef = useRef(direction);
  const nextDirectionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const gameStateRef = useRef(gameState);

  // Keep refs synchronized with state inside useEffect to avoid accessing refs during render
  useEffect(() => {
    directionRef.current = direction;
    snakeRef.current = snake;
    foodRef.current = food;
    gameStateRef.current = gameState;
  }, [direction, snake, food, gameState]);

  // Generate random food not on snake
  const generateFood = useCallback((currentSnake) => {
    let newFood;
    let collision;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      collision = currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
    } while (collision);
    return newFood;
  }, []);

  // Submit score to backend REST API
  const submitScore = useCallback(async (finalScore) => {
    if (!nickname || finalScore === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          gameType: 'snake',
          score: finalScore,
          won: false
        })
      });
      const data = await res.json();
      if (data && data.success) {
        setToastMessage('Score saved to leaderboard!');
      }
    } catch (err) {
      console.warn('[Snake] Score submit failed:', err.message);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage(''), 3000);
    }
  }, [nickname]);

  const handleGameOver = useCallback((finalScore) => {
    setGameState('gameover');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('snake_high_score', finalScore.toString());
    }
    submitScore(finalScore);
  }, [highScore, submitScore]);

  // Start game
  const startGame = useCallback(() => {
    const initSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    const initDir = { x: 1, y: 0 };
    setSnake(initSnake);
    setDirection(initDir);
    directionRef.current = initDir;
    nextDirectionRef.current = initDir;
    setFood(generateFood(initSnake));
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameState('playing');
  }, [generateFood]);

  // Keyboard controls (Arrow keys + WASD)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      const currentDir = directionRef.current;
      let newDir = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y === 0) newDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y === 0) newDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x === 0) newDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x === 0) newDir = { x: 1, y: 0 };
          break;
        default:
          break;
      }

      if (newDir) {
        e.preventDefault();
        nextDirectionRef.current = newDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame]);

  // Main game tick loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      const curSnake = [...snakeRef.current];
      const curDir = nextDirectionRef.current;
      directionRef.current = curDir;
      setDirection(curDir);

      const head = { ...curSnake[0] };
      const newHead = { x: head.x + curDir.x, y: head.y + curDir.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver(score);
        return;
      }

      // Self collision
      if (curSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        handleGameOver(score);
        return;
      }

      curSnake.unshift(newHead);

      // Eat food
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        const nextScore = score + 10;
        setScore(nextScore);
        const nextFood = generateFood(curSnake);
        setFood(nextFood);

        // Speed increases every 5 food items (50 points)
        if (nextScore % 50 === 0) {
          setSpeed((prev) => Math.max(prev - 12, 60));
        }
      } else {
        curSnake.pop();
      }

      setSnake(curSnake);
    }, speed);

    return () => clearInterval(interval);
  }, [gameState, speed, score, generateFood, handleGameOver]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = '#0c0d11';
    ctx.fillRect(0, 0, CANVAS_DIM, CANVAS_DIM);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_DIM);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_DIM, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw Food with a soft glow
    ctx.save();
    ctx.shadowColor = 'rgba(212, 162, 74, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#d4a24a';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2.4,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Draw Snake
    snake.forEach((seg, index) => {
      ctx.save();
      if (index === 0) {
        // Snake head
        ctx.fillStyle = '#e2ba6d';
        ctx.shadowColor = 'rgba(212, 162, 74, 0.4)';
        ctx.shadowBlur = 6;
      } else {
        // Body — alternating steel tones, no glow
        ctx.fillStyle = index % 2 === 0 ? '#7e9bb8' : '#6a87a4';
      }

      ctx.beginPath();
      const radius = 4;
      const x = seg.x * CELL_SIZE + 1;
      const y = seg.y * CELL_SIZE + 1;
      const w = CELL_SIZE - 2;
      const h = CELL_SIZE - 2;
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      ctx.restore();
    });
  }, [snake, food]);

  // Direction button click handler for on-screen D-Pad
  const handleDpad = (newDir) => {
    const currentDir = directionRef.current;
    if (newDir.x !== 0 && currentDir.x === 0) {
      nextDirectionRef.current = newDir;
    } else if (newDir.y !== 0 && currentDir.y === 0) {
      nextDirectionRef.current = newDir;
    }
  };

  return (
    <div className="snake-container">
      {/* Header with Scores */}
      <div className="snake-header">
        <div className="snake-stats">
          <div className="stat-box">
            <span className="stat-label">Score</span>
            <span className="stat-val" style={{ color: 'var(--color-accent-light)' }}>{score}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">High Score</span>
            <span className="stat-val">{highScore}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {gameState === 'playing' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setGameState('paused')}
              style={{ padding: '6px 12px', fontSize: 'var(--t-xs)' }}
            >
              Pause
            </button>
          )}
          {gameState === 'paused' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGameState('playing')}
              style={{ padding: '6px 12px', fontSize: 'var(--t-xs)' }}
            >
              Resume
            </button>
          )}
          {onExit && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onExit}
              style={{ padding: '6px 12px', fontSize: 'var(--t-xs)' }}
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="snake-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_DIM}
          height={CANVAS_DIM}
          className="snake-canvas"
        />

        {/* Start / Idle Overlay */}
        {gameState === 'idle' && (
          <div className="snake-overlay">
            <h2 style={{ fontSize: 'var(--t-2xl)', fontWeight: 800 }}>Ready to Slither?</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 'var(--t-sm)', maxWidth: '300px' }}>
              Use Arrow keys or WASD to navigate. Eat the amber orbs to grow.
            </p>
            <button type="button" className="btn btn-primary" onClick={startGame} style={{ padding: '12px 28px', fontWeight: 700 }}>
              Start Game (Space)
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className="snake-overlay">
            <h2 style={{ fontSize: 'var(--t-2xl)', fontWeight: 800 }}>Game Paused</h2>
            <button type="button" className="btn btn-primary" onClick={() => setGameState('playing')}>
              Resume Game
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="snake-overlay">
            <h2 style={{ fontSize: 'var(--t-2xl)', fontWeight: 800 }}>Game Over</h2>
            <div style={{ display: 'flex', gap: 'var(--s6)', margin: 'var(--s2) 0' }}>
              <div>
                <span className="stat-label">Final Score</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-hi)' }}>{score}</div>
              </div>
              <div>
                <span className="stat-label">Best</span>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{highScore}</div>
              </div>
            </div>

            {score >= highScore && score > 0 && (
              <span className="badge badge-accent" style={{ marginBottom: 'var(--s2)' }}>
                New personal record
              </span>
            )}

            {isSubmitting && (
              <span style={{ fontSize: 'var(--t-xs)', color: 'var(--text-2)' }}>
                Saving score to leaderboard...
              </span>
            )}

            <div style={{ display: 'flex', gap: 'var(--s3)' }}>
              <button type="button" className="btn btn-primary" onClick={startGame} style={{ padding: '10px 20px', fontWeight: 700 }}>
                Play Again (Space)
              </button>
              {onExit && (
                <button type="button" className="btn btn-secondary" onClick={onExit} style={{ padding: '10px 20px' }}>
                  Back to Hub
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch D-Pad */}
      <div className="snake-dpad" aria-label="Touch Controls">
        <div></div>
        <button type="button" className="dpad-btn" onClick={() => handleDpad({ x: 0, y: -1 })}>↑</button>
        <div></div>
        <button type="button" className="dpad-btn" onClick={() => handleDpad({ x: -1, y: 0 })}>←</button>
        <button type="button" className="dpad-btn" onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <button type="button" className="dpad-btn" onClick={() => handleDpad({ x: 1, y: 0 })}>→</button>
        <div></div>
        <button type="button" className="dpad-btn" onClick={() => handleDpad({ x: 0, y: 1 })}>↓</button>
        <div></div>
      </div>

      {/* Score Saved Toast */}
      {toastMessage && (
        <div className="toast-score">
          <span style={{ color: 'var(--green)' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
