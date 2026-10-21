import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import './tictactoe.css';

export default function TicTacToe({ roomCode, _isHost, onExit }) {
  const { nickname, socket } = usePlayer();
  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : 'Player');

  const [gameState, setGameState] = useState({
    board: Array(9).fill(null),
    playerX: 'Player 1',
    playerO: 'Player 2',
    currentTurn: 'Player 1',
    status: 'in_game',
    winner: null,
    winningLine: null,
    moveCount: 0,
    rematchVotes: [],
    isVsBot: false
  });

  const [hoverIndex, setHoverIndex] = useState(null);
  const [turnWarning, setTurnWarning] = useState('');
  const [rematchLoading, setRematchLoading] = useState(false);

  // Sync with server state
  useEffect(() => {
    if (!socket || !roomCode) return;

    // Fetch initial state
    socket.emit('ttt:get', { roomCode }, (res) => {
      if (res && res.success && res.game) {
        setGameState(res.game);
      }
    });

    // Listen to real-time updates
    const handleState = (state) => {
      if (state && state.roomCode === roomCode) {
        setGameState(state);
        setRematchLoading(false);
      }
    };

    socket.on('ttt:state', handleState);

    return () => {
      socket.off('ttt:state', handleState);
    };
  }, [socket, roomCode]);

  const {
    board,
    playerX,
    playerO,
    currentTurn,
    status,
    winner,
    winningLine,
    rematchVotes,
    isVsBot,
    isForfeit,
    forfeitedBy,
    opponentLeft,
    leftPlayer
  } = gameState;

  const isPlayerX = currentNick === playerX;
  const isPlayerO = currentNick === playerO;
  const myMark = isPlayerX ? 'X' : isPlayerO ? 'O' : null;
  const isMyTurn = status === 'in_game' && currentTurn === currentNick;
  const isSpectator = !isPlayerX && !isPlayerO;

  // Handle cell click
  const handleCellClick = (index) => {
    if (status !== 'in_game') return;

    if (board[index] !== null) {
      return;
    }

    if (!isMyTurn) {
      setTurnWarning(`It's ${currentTurn}'s turn!`);
      setTimeout(() => setTurnWarning(''), 2500);
      return;
    }

    if (!socket) return;

    socket.emit('ttt:move', { roomCode, cellIndex: index, nickname: currentNick }, (res) => {
      if (res && !res.success) {
        setTurnWarning(res.error || 'Invalid move');
        setTimeout(() => setTurnWarning(''), 2500);
      }
    });
  };

  // Handle rematch request
  const handleRequestRematch = () => {
    if (!socket || rematchLoading) return;
    setRematchLoading(true);
    socket.emit('ttt:rematch', { roomCode, nickname: currentNick });
  };

  const hasVotedRematch = rematchVotes?.includes(currentNick);
  const isGameOver = status === 'finished';
  const isVictory = winner === currentNick;
  const isDefeat = winner && winner !== 'draw' && winner !== currentNick;
  const isDraw = winner === 'draw';

  return (
    <div className="ttt-container">
      {/* 1v1 Matchup Header */}
      <div className="ttt-matchup-header">
        {/* Player X */}
        <div className={`ttt-player-card player-x ${currentTurn === playerX && status === 'in_game' ? 'active-turn' : ''}`}>
          <Avatar nickname={playerX} size="md" />
          <div className="ttt-player-info">
            <div className="ttt-player-name">
              <span>{playerX}</span>
              <span className="ttt-badge-mark ttt-badge-x">X</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
              {playerX === currentNick && <Badge variant="accent" style={{ fontSize: '9px', padding: '1px 5px' }}>YOU</Badge>}
              {currentTurn === playerX && status === 'in_game' && (
                <Badge variant="primary" style={{ fontSize: '9px', padding: '1px 5px' }}>TURN</Badge>
              )}
            </div>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="ttt-vs-badge">VS</div>

        {/* Player O */}
        <div className={`ttt-player-card player-o ${currentTurn === playerO && status === 'in_game' ? 'active-turn' : ''}`}>
          <div className="ttt-player-info" style={{ textAlign: 'right', alignItems: 'flex-end' }}>
            <div className="ttt-player-name">
              <span className="ttt-badge-mark ttt-badge-o">O</span>
              <span>{playerO}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
              {currentTurn === playerO && status === 'in_game' && (
                <Badge variant="primary" style={{ fontSize: '9px', padding: '1px 5px' }}>TURN</Badge>
              )}
              {playerO === currentNick && <Badge variant="accent" style={{ fontSize: '9px', padding: '1px 5px' }}>YOU</Badge>}
              {isVsBot && playerO.includes('Bot') && (
                <Badge variant="warning" style={{ fontSize: '9px', padding: '1px 5px' }}>BOT</Badge>
              )}
            </div>
          </div>
          <Avatar nickname={playerO} size="md" />
        </div>
      </div>

      {/* Turn & Status Announcer */}
      <div className="ttt-turn-banner">
        <div className="ttt-turn-text">
          {status === 'in_game' ? (
            <>
              <span className="ttt-pulse-dot" />
              {isMyTurn ? (
                <span style={{ color: 'var(--accent-hi)' }}>
                  Your turn ({myMark}) — click any empty cell
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Waiting for <strong style={{ color: 'var(--text)' }}>{currentTurn}</strong> to make a move...
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--accent-hi)', fontWeight: 800, letterSpacing: '0.08em' }}>
              MATCH CONCLUDED
            </span>
          )}
        </div>

        <div style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)' }}>
          {turnWarning ? (
            <span style={{ color: 'var(--red)', fontWeight: 700 }}>{turnWarning}</span>
          ) : (
            `Move ${gameState.moveCount} of 9`
          )}
        </div>
      </div>

      {/* 3x3 Interactive Board */}
      <div className="ttt-board-wrapper">
        <div className="ttt-grid">
          {board.map((cellMark, idx) => {
            const isWinningCell = winningLine && winningLine.includes(idx);
            const isFilled = cellMark !== null;
            const showPreview = !isFilled && isMyTurn && hoverIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                className={`ttt-cell ${isWinningCell ? 'winning-cell' : ''} ${!isMyTurn && !isFilled ? 'disabled-turn' : ''}`}
                onClick={() => handleCellClick(idx)}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                disabled={isFilled || status !== 'in_game'}
                aria-label={`Cell ${idx + 1}, ${cellMark || 'empty'}`}
              >
                {cellMark ? (
                  <span className={cellMark === 'X' ? 'ttt-mark-x' : 'ttt-mark-o'}>
                    {cellMark}
                  </span>
                ) : showPreview ? (
                  <span className={`ttt-cell-preview ${myMark === 'X' ? 'ttt-mark-x' : 'ttt-mark-o'}`}>
                    {myMark}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Over Modal / Result Banner */}
      {isGameOver && (
        <div className="ttt-gameover-card">
          <div className="ttt-gameover-title">
            {isVictory ? (
              <span style={{ color: 'var(--green)' }}>VICTORY!</span>
            ) : isDefeat ? (
              <span style={{ color: 'var(--red)' }}>DEFEAT</span>
            ) : isDraw ? (
              <span style={{ color: 'var(--accent-hi)' }}>DRAW / STALEMATE</span>
            ) : (
              <span style={{ color: 'var(--text)' }}>{winner} Won!</span>
            )}
          </div>

          <div className="ttt-gameover-winner">
            {isVictory && (isForfeit ? `Opponent (${forfeitedBy || 'opponent'}) left the match. You won by forfeit! (+100 PTS saved to Leaderboard)` : 'Spectacular play! You connected 3 in a row. (+100 PTS saved to Leaderboard)')}
            {isDefeat && (isForfeit ? `Match forfeited by ${forfeitedBy}.` : `${winner} connected 3 in a row. Better luck next round!`)}
            {isDraw && 'All 9 cells filled with no winner. Perfectly balanced match!'}
            {isSpectator && winner !== 'draw' && `${winner} took the victory!`}
          </div>

          {opponentLeft && (
            <div style={{
      color: 'var(--accent-hi)',
      fontSize: 'var(--t-sm)',
      fontWeight: 600,
      marginBottom: 'var(--s4)',
      padding: '8px 16px',
      background: 'var(--accent-dim)',
              borderRadius: 'var(--radius-md)'
            }}>
              {leftPlayer || 'Your opponent'} left the room. Rematch is unavailable.
            </div>
          )}

          <div className="ttt-action-bar">
            {!isSpectator && !opponentLeft && (
              <Button
                variant={hasVotedRematch ? 'secondary' : 'primary'}
                onClick={handleRequestRematch}
                disabled={hasVotedRematch || rematchLoading}
              >
                {hasVotedRematch
                  ? `Waiting for opponent... (${rematchVotes.length}/${isVsBot ? 1 : 2})`
                  : 'Request Rematch (Swap X/O)'}
              </Button>
            )}

            <Button variant="secondary" onClick={onExit}>
              Return to Hub
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
