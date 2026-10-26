import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { recordPersonalResult } from '../../utils/personalBests.js';
import { createBoard, chooseBotColumn, dropDisc, winningCells } from './connectFour.js';
import './connectfour.css';

export default function ConnectFour({ onExit }) {
  const { nickname } = usePlayer();
  const { play } = useAudio();
  const navigate = useNavigate();
  const [board, setBoard] = useState(createBoard);
  const [turn, setTurn] = useState('red');
  const [status, setStatus] = useState('playing');
  const [winner, setWinner] = useState(null);
  const [winning, setWinning] = useState([]);
  const [recorded, setRecorded] = useState(false);

  const nick = nickname || 'Player';
  const leave = onExit || (() => navigate('/hub'));
  const isBotTurn = status === 'playing' && turn === 'yellow';
  const winningSet = useMemo(() => new Set(winning.map(([row, column]) => `${row}-${column}`)), [winning]);

  const finish = useCallback((nextBoard, move, disc) => {
    const cells = winningCells(nextBoard, move.row, move.column, disc);
    if (cells.length >= 4) {
      setStatus('finished');
      setWinner(disc);
      setWinning(cells);
      play('victory');
      if (!recorded) {
        recordPersonalResult({ gameType: 'connect4', won: disc === 'red', score: disc === 'red' ? 100 : 0 });
        setRecorded(true);
      }
      return true;
    }
    if (nextBoard[0].every(Boolean)) {
      setStatus('finished');
      setWinner('draw');
      play('buzzer');
      if (!recorded) {
        recordPersonalResult({ gameType: 'connect4', won: false, score: 0 });
        setRecorded(true);
      }
      return true;
    }
    return false;
  }, [play, recorded]);

  const playColumn = useCallback((column, disc) => {
    if (status !== 'playing' || turn !== disc) return;
    const move = dropDisc(board, column, disc);
    if (!move) return;
    setBoard(move.board);
    play('move');
    if (finish(move.board, move, disc)) return;
    setTurn(disc === 'red' ? 'yellow' : 'red');
  }, [board, finish, play, status, turn]);

  useEffect(() => {
    if (!isBotTurn) return undefined;
    const timer = setTimeout(() => {
      const column = chooseBotColumn(board);
      if (column !== null) playColumn(column, 'yellow');
    }, 520);
    return () => clearTimeout(timer);
  }, [board, isBotTurn, playColumn]);

  const reset = () => {
    setBoard(createBoard());
    setTurn('red');
    setStatus('playing');
    setWinner(null);
    setWinning([]);
    setRecorded(false);
    play('click');
  };

  return (
    <div className="connect4-wrap">
      <div className="connect4-head">
        <div>
          <div className="connect4-kicker mono">CONNECT FOUR / SOLO</div>
          <h2>Drop four in a row</h2>
          <p>{status === 'playing' ? (turn === 'red' ? 'Your turn — choose a column.' : 'ConnectBot is thinking…') : winner === 'red' ? 'You win!' : winner === 'yellow' ? 'ConnectBot wins.' : 'Board full — draw.'}</p>
        </div>
        <div className="connect4-matchup"><span className="connect4-disc red" />{nick}<span className="mono">VS</span><span className="connect4-disc yellow" />ConnectBot</div>
      </div>

      <div className="connect4-board" role="grid" aria-label="Connect Four board">
        {board.map((row, rowIndex) => row.map((disc, column) => (
          <button
            key={`${rowIndex}-${column}`}
            type="button"
            className={`connect4-cell ${disc ? `is-${disc}` : ''} ${winningSet.has(`${rowIndex}-${column}`) ? 'is-winning' : ''}`}
            onClick={() => playColumn(column, 'red')}
            disabled={status !== 'playing' || turn !== 'red' || Boolean(disc)}
            aria-label={`Row ${rowIndex + 1}, column ${column + 1}${disc ? `, ${disc}` : ', empty'}`}
          >
            {disc && <span className={`connect4-disc ${disc}`} />}
          </button>
        )))}
      </div>

      <div className="connect4-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>{status === 'playing' ? 'Restart' : 'Play again'}</button>
        <button type="button" className="btn btn-secondary" onClick={leave}>Back to Hub</button>
      </div>
    </div>
  );
}
