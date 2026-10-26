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

function actionTone(action = '') {
  const text = action.toLowerCase();
  if (text.includes('wins') || text.includes('rematch')) return 'is-win';
  if (text.includes('uno')) return 'is-uno';
  if (text.includes('draw') || text.includes('pending') || text.includes('absorbed')) return 'is-penalty';
  if (text.includes('skip') || text.includes('reverse') || text.includes('wild')) return 'is-special';
  return '';
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

function RoundStatus({ view, isMyTurn = false, isFinal = false }) {
  const round = view.roundNumber || 1;
  const turn = view.turnNumber || 1;
  const who = isMyTurn ? 'YOU' : (view.turnNickname || '—').toUpperCase();

  return (
    <div className={`uno-round-status ${isFinal ? 'is-final' : ''}`} aria-live="polite">
      <span className="urs-round mono">ROUND <strong>{round}</strong></span>
      <span className="urs-divider" aria-hidden="true">·</span>
      <span className="urs-turn mono">TURN <strong>{turn}</strong></span>
      <span className="urs-next">
        {isFinal ? 'ROUND COMPLETE' : <>NOW PLAYING <strong>{who}</strong></>}
      </span>
    </div>
  );
}

function TurnOrder({ view, nickname }) {
  const players = view?.players || [];
  const currentIndex = players.findIndex((player) => player.isTurn);
  const direction = view?.direction === -1 ? -1 : 1;
  const ordered = currentIndex >= 0
    ? players.map((_, offset) => players[(currentIndex + offset * direction + players.length) % players.length])
    : players;
  const meIndex = ordered.findIndex((player) => player.nickname === nickname);
  const afterMe = meIndex >= 0 && ordered.length > 1
    ? ordered[(meIndex + 1) % ordered.length]?.nickname
    : null;

  if (!ordered.length) return null;

  return (
    <section className="uno-turn-map" aria-label="UNO turn order">
      <div className="uno-turn-map-head">
        <div>
          <div className="uno-turn-map-kicker mono">TABLE ROUTE</div>
          <div className="uno-turn-map-title">Who plays after who</div>
        </div>
        <div className="uno-turn-direction mono">
          {direction === 1 ? '↻ CLOCKWISE' : '↺ COUNTER-CLOCKWISE'}
        </div>
      </div>

      <div className="uno-turn-sequence" role="list">
        {ordered.map((player, index) => {
          const isCurrent = index === 0;
          const isAfterMe = player.nickname === afterMe;
          return (
            <React.Fragment key={player.nickname}>
              {index > 0 && <span className="uno-turn-arrow" aria-hidden="true">→</span>}
              <div
                className={`uno-seat-node ${isCurrent ? 'is-current' : ''} ${player.nickname === nickname ? 'is-me' : ''}`}
                role="listitem"
                aria-label={`${player.nickname}, ${isCurrent ? 'current turn' : `${index + 1} in turn order`}`}
              >
                <div className="uno-seat-topline">
                  <span className="uno-seat-index mono">{String(index + 1).padStart(2, '0')}</span>
                  {isCurrent && <span className="uno-seat-live mono">ON TURN</span>}
                  {!isCurrent && isAfterMe && <span className="uno-seat-after mono">AFTER YOU</span>}
                </div>
                <div className="uno-seat-person">
                  <Avatar nickname={player.nickname} size="sm" />
                  <span className="uno-seat-name">{player.nickname}</span>
                  {player.nickname === nickname && <span className="uno-seat-you mono">YOU</span>}
                </div>
                <div className="uno-seat-meta mono">
                  <span>{player.handCount} cards</span>
                  {player.atUno && <span className="uno-seat-uno">UNO</span>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {ordered.length > 1 && (
          <>
            <span className="uno-turn-arrow uno-turn-arrow--loop" aria-hidden="true">→</span>
            <span className="uno-turn-loop mono">BACK TO {ordered[0].nickname.toUpperCase()}</span>
          </>
        )}
      </div>
    </section>
  );
}

export default function Uno({ roomCode, onExit }) {
  const { nickname } = usePlayer();
  const [game, setGame] = useState(null);
  const [pubState, setPubState] = useState(null); // public state for spectators
  const [toast, setToast] = useState('');
  const [wildPick, setWildPick] = useState(null); // card object awaiting color
  const [rematchBusy, setRematchBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const toastTimer = useRef(null);
  const lastActionRef = useRef('');

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
    // The Uno component stays mounted across rematches, so the rematch button
    // has to clear its busy flag when the next round actually begins —
    // otherwise it stays disabled on "Starting…" for every later round.
    const onSession = (s) => {
      setGame(s);
      if (s?.status === 'in_game') setRematchBusy(false);
    };
    const onState = (s) => {
      setPubState(s); // public state — spectators use this
      if (s?.status === 'in_game') setRematchBusy(false);
    };

    socket.on('uno:session', onSession);
    socket.on('uno:state', onState);

    const onEnd = () => {
      socket.emit('uno:get', { roomCode }, () => {});
    };
    socket.on('uno:end', onEnd);

    // Request fresh state on mount
    socket.emit('uno:get', { roomCode }, (res) => {
      if (res && res.error) showToast(res.error);
    });

    const poll = setInterval(() => {
      setTick((t) => t + 1);
      setNow(Date.now());
    }, 500);

    return () => {
      socket.off('uno:session', onSession);
      socket.off('uno:state', onState);
      socket.off('uno:end', onEnd);
      clearInterval(poll);
    };
  }, [roomCode]);

  // Announce server-side table events (UNO calls, penalties, skips, timeouts).
  const lastAction = (game || pubState)?.lastAction || '';
  useEffect(() => {
    if (!lastAction || lastAction === lastActionRef.current) return;
    lastActionRef.current = lastAction;
    showToast(lastAction);
  }, [lastAction]);

  // --- Determine if spectator ---
  // Spectators are players in the room who are NOT in the game's player list.
  // They get `uno:state` (public) but never `uno:session` (private hand).
  const view = game || pubState;

  if (!view) {
    return (
      <div className="uno-wrap">
        <div className="uno-loading mono">SHUFFLING DECK…</div>
        <button type="button" className="btn btn-ghost" onClick={onExit}>Back to lobby</button>
      </div>
    );
  }

  // Check if the current player is a participant
  const playerSeat = view.players?.find((p) => p.nickname === nickname);
  const isSpectator = !playerSeat && !game; // no session = not a player
  const yourHand = game?.yourHand || [];
  const playableIds = game?.playableIds || [];
  const isMyTurn = Boolean(game?.isYourTurn);
  const mustDraw = Boolean(game?.mustDraw);
  const unoWindowLeft = view.unoDeadline ? Math.max(0, Math.ceil((view.unoDeadline - now) / 1000)) : 0;
  const isFinal = view.status === 'finished';

  // Turn clock (server-authoritative deadline, re-rendered by the 500 ms tick).
  const turnMs = view.turnMs || 25000;
  const turnLeftMs = view.turnEndsAt ? Math.max(0, view.turnEndsAt - now) : 0;
  const turnLeft = Math.ceil(turnLeftMs / 1000);
  const turnPct = Math.max(0, Math.min(100, (turnLeftMs / turnMs) * 100));
  const turnUrgent = turnLeftMs > 0 && turnLeftMs <= 6000;

  // After drawing you may only play that card (or pass).
  const drawnCardId = game?.drawnCardId || null;
  const allowedIds = drawnCardId ? [drawnCardId] : playableIds;
  const noPlayableCards = isMyTurn && !mustDraw && playableIds.length === 0 && !drawnCardId && !view.pendingDraw;

  // Can the current player stack? (+2 or +4 when pendingDraw > 0)
  const canStack = isMyTurn && view.pendingDraw > 0;
  const stackableIds = canStack
    ? yourHand.filter((c) => c.type === 'draw2' || c.type === 'wild4').map((c) => c.id)
    : [];

  const doPlay = (card) => {
    if (!allowedIds.includes(card.id) && !stackableIds.includes(card.id)) {
      showToast(
        drawnCardId
          ? 'You drew this turn — play the drawn card or pass.'
          : mustDraw
            ? `You must draw ${view.pendingDraw} first!`
            : canStack
              ? `You can stack with a +2 or +4, or draw ${view.pendingDraw}.`
              : 'That card cannot be played right now.'
      );
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

  const doPass = () => {
    socket.emit('uno:pass', { roomCode }, (res) => {
      if (res && !res.success) showToast(res.error || 'Cannot pass right now.');
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
    if (rematchBusy) return;
    setRematchBusy(true);
    socket.emit('uno:rematch', { roomCode }, (res) => {
      if (!res || !res.success) {
        setRematchBusy(false);
        showToast(res?.error || 'Could not restart.');
      }
    });
  };

  /* ---------- Final screen ---------- */
  if (isFinal) {
    const winner = (view.standings || []).find((s) => s.isWinner) || { nickname: view.winner };
    const winnerScore = winner.score ?? Math.max(
      (view.standings || []).reduce((acc, s) => acc + (s.isWinner ? 0 : s.cardPoints || 0), 0),
      1
    );
    return (
      <div className="uno-wrap">
        <div className="uno-final">
          <RoundStatus view={view} isFinal />
          <div className="uno-final-trophy">🏆</div>
          <h2 className="uno-final-title">
            {winner.nickname} wins{view.isForfeit ? ' by forfeit' : ''}!
          </h2>
          <div className="uno-final-score">
            <strong>+{winnerScore} points</strong> this round
          </div>

          <div className="uno-standing-head mono">STANDINGS</div>
          <div className="uno-standings">
            {(view.standings || []).map((s, i) => (
              <div key={s.nickname} className={`uno-standing ${s.isWinner ? 'is-winner' : ''}`}>
                <span className="us-rank mono">#{s.rank ?? i + 1}</span>
                <Avatar nickname={s.nickname} size="sm" />
                <span className="us-name">{s.nickname}</span>
                {s.isWinner && <span className="us-crown">👑</span>}
                <span className="us-cards mono">
                  {s.isWinner
                    ? `+${s.score ?? winnerScore} pts`
                    : `${s.cardPoints ?? 0} pts left · ${s.cardsRemaining ?? 0} cards`}
                </span>
              </div>
            ))}
          </div>

          <div className="uno-final-actions">
            {!isSpectator && (
              <button type="button" className="btn btn-primary" onClick={doRematch} disabled={rematchBusy}>
                {rematchBusy ? 'Starting…' : 'Play Again'}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onExit}>
              Back to Lobby
            </button>
          </div>
        </div>
        {toast && <div className="uno-toast">{toast}</div>}
      </div>
    );
  }

  /* ---------- Spectator view ---------- */
  if (isSpectator) {
    return (
      <div className="uno-wrap uno-spectator">
        <RoundStatus view={view} />
        <div className="uno-spec-badge mono">👁 SPECTATING</div>

        <TurnOrder view={view} nickname={nickname} />

        {/* Center pile */}
        <div className="uno-center">
          <div className="uno-dir mono">
            {view.direction === 1 ? '⟳ CW' : '⟲ CCW'}
            {' · deck '}{view.deckSize}
            {view.pendingDraw > 0 && <span className="uno-pendwarn"> · +{view.pendingDraw} PENDING</span>}
          </div>

          {view.turnEndsAt && (
            <div className={`uno-clock ${turnUrgent ? 'is-urgent' : ''}`}>
              <div className="ucl-row">
                <span className="ucl-who mono">
                  {(view.turnNickname || '').toUpperCase()}’S TURN
                </span>
                <span className="ucl-time mono">{turnLeft}s</span>
              </div>
              <div className="ucl-track">
                <span className="ucl-fill" style={{ width: `${turnPct}%` }} />
              </div>
            </div>
          )}

          <div className="uno-piles">
            <div className="uno-drawpile">
              <div className="uno-card-back">
                <span>UNO</span>
              </div>
              <span className="uno-drawpile-label mono">
                {view.pendingDraw > 0 ? `DRAW ${view.pendingDraw}` : 'DRAW'}
              </span>
            </div>

            <div key={view.topCard?.id || 'empty-discard'} className={`uno-discard c-${view.topCard?.color}`}>
              <span className="uno-discard-face">{view.topCard ? cardLabel(view.topCard) : '?'}</span>
            </div>
            <div className="uno-currentcolor mono">
              COLOR: <span className={`cc cc-${view.currentColor}`}>{(view.currentColor || '').toUpperCase()}</span>
            </div>
          </div>

          {view.pendingDraw > 0 && (
            <div className="uno-banner uno-banner--stack">
              ⚡ Draw stack: <strong>+{view.pendingDraw}</strong> — {view.turnNickname} must stack or draw!
            </div>
          )}

          {view.lastAction && (
            <div key={view.lastAction} className={`uno-feed mono ${actionTone(view.lastAction)}`}>
              {view.lastAction}
            </div>
          )}
        </div>

        <div className="uno-spec-hand mono">
          {view.players?.map((p) => (
            <span key={p.nickname} className="uno-spec-cardcount">
              {p.nickname}: {p.handCount} 🂠
            </span>
          ))}
        </div>

        {toast && <div className="uno-toast">{toast}</div>}
        <span className="uno-tick" data-tick={tick} hidden />
      </div>
    );
  }

  /* ---------- In-game view (player) ---------- */
  return (
    <div className="uno-wrap">
      <RoundStatus view={view} isMyTurn={isMyTurn} />
      {/* Turn banner — big, hard to miss */}
      <div className={`uno-turn-banner ${isMyTurn ? 'is-mine' : ''}`}>
        {isMyTurn ? (
          <span className="utb-text">🎯 YOUR TURN</span>
        ) : (
          <span className="utb-text">⏳ {view.turnNickname}'s turn</span>
        )}
      </div>

      <TurnOrder view={view} nickname={nickname} />

      {/* Center pile */}
      <div className="uno-center">
        <div className="uno-dir mono">
          {view.direction === 1 ? '⟳ CW' : '⟲ CCW'}
          {' · deck '}{view.deckSize}
          {view.pendingDraw > 0 && <span className="uno-pendwarn"> · +{view.pendingDraw} PENDING</span>}
        </div>

        {view.turnEndsAt && (
          <div className={`uno-clock ${isMyTurn ? 'is-me' : ''} ${turnUrgent ? 'is-urgent' : ''}`}>
            <div className="ucl-row">
              <span className="ucl-who mono">
                {isMyTurn ? 'YOUR TURN' : `${(view.turnNickname || '').toUpperCase()}’S TURN`}
              </span>
              <span className="ucl-time mono">{turnLeft}s</span>
            </div>
            <div className="ucl-track">
              <span className="ucl-fill" style={{ width: `${turnPct}%` }} />
            </div>
          </div>
        )}

        <div className="uno-piles">
          <button
            type="button"
            className={`uno-drawpile ${isMyTurn ? 'is-my-turn' : ''}`}
            onClick={doDraw}
            disabled={!isMyTurn}
            title="Draw a card"
          >
            <div className="uno-card-back">
              <span>UNO</span>
            </div>
            <span className="uno-drawpile-label mono">
              {mustDraw ? `DRAW ${view.pendingDraw}` : canStack ? `DRAW ${view.pendingDraw} or STACK` : 'DRAW'}
            </span>
          </button>

          <div key={view.topCard?.id || 'empty-discard'} className={`uno-discard c-${view.topCard?.color}`}>
            <span className="uno-discard-face">{view.topCard ? cardLabel(view.topCard) : '?'}</span>
          </div>
          <div className="uno-currentcolor mono">
            COLOR: <span className={`cc cc-${view.currentColor}`}>{(view.currentColor || '').toUpperCase()}</span>
          </div>
        </div>

        {canStack && (
          <div className="uno-banner uno-banner--stack">
            ⚡ Draw stack: <strong>+{view.pendingDraw}</strong> pending — play a <strong>+2</strong> or <strong>+4</strong> to stack, or draw to absorb!
          </div>
        )}

        {mustDraw && !canStack && (
          <div className="uno-banner">
            ⚠️ You absorbed a draw stack — tap the deck to take {view.pendingDraw} and skip.
          </div>
        )}

        {noPlayableCards && (
          <div className="uno-banner uno-banner--hint">
            No card matches {view.currentColor} — tap the deck to pick one.
          </div>
        )}

        {drawnCardId && isMyTurn && (
          <div className="uno-banner uno-banner--drawn">
            You drew a playable card — play it, or{' '}
            <button type="button" className="uno-passlink" onClick={doPass}>pass the turn</button>.
          </div>
        )}

        {view.lastAction && (
          <div key={view.lastAction} className={`uno-feed mono ${actionTone(view.lastAction)}`}>
            {view.lastAction}
          </div>
        )}

        {view.unoPending && view.unoPending !== nickname && (
          <button type="button" className="uno-catch" onClick={() => doCatch(view.unoPending)}>
            Catch {view.unoPending}! (+2)
          </button>
        )}
        {view.unoPending === nickname && (
          <button type="button" className="uno-call" onClick={doCallUno}>
            UNO! ({unoWindowLeft}s)
          </button>
        )}
      </div>

      {/* My hand */}
      <div className={`uno-hand ${isMyTurn ? 'my-turn' : ''}`}>
        {yourHand.length === 0 && <div className="mono uno-waiting">WAITING…</div>}
        {yourHand.map((card) => {
          // When stacking, +2 and +4 cards are highlighted as playable
          const isStackable = canStack && (card.type === 'draw2' || card.type === 'wild4');
          const isCardPlayable = isSpectator ? false : (allowedIds.includes(card.id) || isStackable);
          return (
            <HandCard
              key={card.id}
              card={card}
              playable={isCardPlayable}
              dimmed={!isMyTurn || (Boolean(drawnCardId) && card.id !== drawnCardId)}
              isTurn={isMyTurn}
              onClick={() => doPlay(card)}
            />
          );
        })}
      </div>

      {/* Wild color picker */}
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
