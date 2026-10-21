import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import socket from '../../socket/socket.js';
import './uno.css';

const COLOR_ORDER = ['red', 'yellow', 'green', 'blue'];

const SYMBOLS = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: 'WILD',
  wild4: '+4'
};

function cardLabel(card) {
  if (card.type === 'number') return String(card.value);
  return SYMBOLS[card.type] || '?';
}

function HandCard({ card, playable, dimmed, isTurn, onClick }) {
  return (
    <button
      type="button"
      className={[
        'uno-card',
        `c-${card.color}`,
        card.type !== 'number' ? 'is-special' : '',
        playable ? 'is-playable' : '',
        dimmed ? 'is-dimmed' : '',
        isTurn && playable ? 'is-active-turn' : ''
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      title={playable ? 'Play this card' : 'Not playable right now'}
    >
      <span className="uc-corner uc-tl">{cardLabel(card)}</span>
      <span className="uc-face">{cardLabel(card)}</span>
      <span className="uc-corner uc-br">{cardLabel(card)}</span>
    </button>
  );
}

export default function Uno({ roomCode, onExit }) {
  const { nickname } = usePlayer();
  const [game, setGame] = useState(null);
  const [toast, setToast] = useState('');
  const [wildPick, setWildPick] = useState(null); // card object awaiting color
  const [tick, setTick] = useState(0);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  // Clear in-memory game state before leaving (compaction fix)
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const onSession = (s) => setGame(s);
    socket.on('uno:session', onSession);

    const onEnd = () => {
      socket.emit('uno:get', { roomCode }, () => {});
    };
    socket.on('uno:end', onEnd);

    // Request fresh state on mount
    socket.emit('uno:get', { roomCode }, (res) => {
      if (res && res.error) showToast(res.error);
    });

    const poll = setInterval(() => setTick((t) => t + 1), 500);

    return () => {
      socket.off('uno:session', onSession);
      socket.off('uno:end', onEnd);
      clearInterval(poll);
    };
  }, [roomCode]);

  if (!game) {
    return (
      <div className="uno-wrap">
        <div className="uno-loading mono">SHUFFLING DECK…</div>
        <button type="button" className="btn btn-ghost" onClick={onExit}>Back to lobby</button>
      </div>
    );
  }

  const me = game.players.find((p) => p.nickname === nickname);
  const isSpectator = !me;
  const yourHand = game.yourHand || [];
  const playableIds = game.playableIds || [];
  const isMyTurn = Boolean(game.isYourTurn);
  const mustDraw = Boolean(game.mustDraw);
  const unoWindowLeft = game.unoDeadline ? Math.max(0, Math.ceil((game.unoDeadline - Date.now()) / 1000)) : 0;
  const isFinal = game.status === 'finished';

  const doPlay = (card) => {
    if (!playableIds.includes(card.id)) {
      showToast(mustDraw ? `You must draw ${game.pendingDraw} first!` : 'That card cannot be played right now.');
      return;
    }
    if (card.color === 'wild') {
      setWildPick(card);
      return;
    }
    socket.emit('uno:play', { roomCode, cardId: card.id }, (res) => {
      if (res && !res.success) showToast(res.error || 'Could not play that card.');
    });
  };

  const confirmWild = (color) => {
    if (!wildPick) return;
    socket.emit('uno:play', { roomCode, cardId: wildPick.id, chosenColor: color }, (res) => {
      if (res && !res.success) showToast(res.error || 'Could not play that card.');
    });
    setWildPick(null);
  };

  const doDraw = () => {
    socket.emit('uno:draw', { roomCode }, (res) => {
      if (res && !res.success) showToast(res.error || 'Cannot draw right now.');
    });
  };

  const doCallUno = () => {
    socket.emit('uno:call', { roomCode }, (res) => {
      if (res && !res.success) showToast(res.error || 'Cannot call UNO.');
    });
  };

  const doCatch = (target) => {
    socket.emit('uno:catch', { roomCode, target }, (res) => {
      if (res && !res.success) showToast(res.error || 'Cannot catch.');
    });
  };

  const doRematch = () => {
    socket.emit('uno:rematch', { roomCode }, (res) => {
      if (res && !res.success) showToast(res.error || 'Could not restart.');
    });
  };

  /* ---------- Final screen (M11-13) ---------- */
  if (isFinal) {
    const winner = (game.standings || []).find((s) => s.isWinner) || { nickname: game.winner };
    return (
      <div className="uno-wrap">
        <div className="uno-final">
          <div className="uno-final-trophy">🏆</div>
          <h2 className="uno-final-title">
            {winner.nickname} wins{game.isForfeit ? ' by forfeit' : ''}!
          </h2>

          <div className="uno-standing-head mono">STANDINGS</div>
          <div className="uno-standings">
            {(game.standings || []).map((s, i) => (
              <div key={s.nickname} className={`uno-standing ${s.isWinner ? 'is-winner' : ''}`}>
                <span className="us-rank mono">#{i + 1}</span>
                <Avatar nickname={s.nickname} size="sm" />
                <span className="us-name">{s.nickname}</span>
                {s.isWinner && <span className="us-crown">👑</span>}
                <span className="us-cards mono">
                  {s.isWinner ? `+${Math.max((game.standings || []).reduce(
                    (acc, x) => acc + (x.isWinner ? 0 : x.cardPoints), 0), 1)} pts` : `${s.cardsRemaining} cards`}
                </span>
              </div>
            ))}
          </div>

          <div className="uno-final-actions">
            <button type="button" className="btn btn-primary" onClick={doRematch}>
              Play Again
            </button>
            <button type="button" className="btn btn-ghost" onClick={onExit}>
              Back to Lobby
            </button>
          </div>
        </div>
        {toast && <div className="uno-toast">{toast}</div>}
      </div>
    );
  }

  /* ---------- In-game view ---------- */
  return (
    <div className="uno-wrap">
      {/* Opponent rail */}
      <div className="uno-opp-rail">
        {game.players.map((p) => (
          <div key={p.nickname} className={`uno-opp ${p.isTurn ? 'is-turn' : ''} ${p.nickname === nickname ? 'is-me' : ''}`}>
            <Avatar nickname={p.nickname} size="sm" />
            <span className="uo-name">{p.nickname}{p.nickname === nickname ? ' (you)' : ''}</span>
            <span className="uo-count mono">{p.handCount}</span>
          </div>
        ))}
      </div>

      {/* Center pile */}
      <div className="uno-center">
        <div className="uno-dir mono">
          {game.direction === 1 ? '⟳ CW' : '⟲ CCW'}
          {' · deck '}{game.deckSize}
          {game.pendingDraw > 0 && <span className="uno-pendwarn"> · +{game.pendingDraw} PENDING</span>}
        </div>

        <div className="uno-piles">
          <button
            type="button"
            className={`uno-drawpile ${isMyTurn ? 'is-my-turn' : ''}`}
            onClick={doDraw}
            disabled={!isMyTurn || isSpectator}
            title="Draw a card"
          >
            <div className="uno-card-back">
              <span>UNO</span>
            </div>
            <span className="uno-drawpile-label mono">{mustDraw ? `DRAW ${game.pendingDraw}` : 'DRAW'}</span>
          </button>

          <div className={`uno-discard c-${game.topCard.color}`}>
            <span className="uno-discard-face">{cardLabel(game.topCard)}</span>
          </div>
          <div className="uno-currentcolor mono">
            COLOR: <span className={`cc cc-${game.currentColor}`}>{game.currentColor.toUpperCase()}</span>
          </div>
        </div>

        {mustDraw && (
          <div className="uno-banner">
            ⚠️ You absorbed a draw stack — tap the deck to take {game.pendingDraw} and skip.
          </div>
        )}

        {game.unoPending && game.unoPending !== nickname && (
          <button type="button" className="uno-catch" onClick={() => doCatch(game.unoPending)}>
            Catch {game.unoPending}! (+2)
          </button>
        )}
        {game.unoPending === nickname && (
          <button type="button" className="uno-call" onClick={doCallUno}>
            UNO! ({unoWindowLeft}s)
          </button>
        )}
      </div>

      {/* My hand */}
      <div className={`uno-hand ${isMyTurn ? 'my-turn' : ''}`}>
        {yourHand.length === 0 && <div className="mono uno-waiting">WAITING…</div>}
        {yourHand.map((card) => (
          <HandCard
            key={card.id}
            card={card}
            playable={isSpectator ? false : playableIds.includes(card.id)}
            dimmed={!isMyTurn}
            isTurn={isMyTurn}
            onClick={() => doPlay(card)}
          />
        ))}
      </div>

      {/* Wild color picker (M11-10) */}
      {wildPick && (
        <div className="uno-colorpick" role="dialog" aria-label="Choose a color">
          <div className="ucp-box">
            <div className="ucp-title mono">CHOOSE A COLOR</div>
            <div className="ucp-grid">
              {COLOR_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ucp-swatch sw-${c}`}
                  onClick={() => confirmWild(c)}
                  aria-label={c}
                >
                  <span className="mono">{c.toUpperCase()}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-ghost ucp-cancel" onClick={() => setWildPick(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && <div className="uno-toast">{toast}</div>}
      <span className="uno-tick" data-tick={tick} hidden />
    </div>
  );
}
