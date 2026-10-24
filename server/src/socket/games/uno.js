import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

// Active UNO games map: roomCode -> GameState
const activeUnoGames = new Map();

const COLORS = ['red', 'yellow', 'green', 'blue'];
const UNO_CALL_WINDOW_MS = 5000; // M11-11: 5s window to call UNO
// Every turn has a visible clock. When it runs out the seat draws a card and the
// turn passes, so one player walking away can no longer freeze the table.
const TURN_MS = Number(process.env.UNO_TURN_MS) > 0 ? Number(process.env.UNO_TURN_MS) : 25000;

// Card point values (classic UNO scoring)
export function cardPoints(card) {
  if (card.type === 'number') return card.value;
  if (card.type === 'wild' || card.type === 'wild4') return 50;
  return 20; // skip / reverse / draw2
}

/**
 * Build & shuffle the 108-card UNO deck (M11-01)
 */
export function buildUnoDeck() {
  const deck = [];
  for (const color of COLORS) {
    deck.push({ id: `${color}-0`, color, type: 'number', value: 0 });
    for (let v = 1; v <= 9; v++) {
      for (let d = 0; d < 2; d++) {
        deck.push({ id: `${color}-${v}-${d}`, color, type: 'number', value: v });
      }
    }
    for (const type of ['skip', 'reverse', 'draw2']) {
      for (let d = 0; d < 2; d++) {
        deck.push({ id: `${color}-${type}-${d}`, color, type, value: null });
      }
    }
  }
  for (let d = 0; d < 4; d++) {
    deck.push({ id: `wild-${d}`, color: 'wild', type: 'wild', value: null });
    deck.push({ id: `wild4-${d}`, color: 'wild', type: 'wild4', value: null });
  }
  return shuffle(deck);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getUnoGame(roomCode) {
  return activeUnoGames.get(roomCode?.toUpperCase()?.trim());
}

/**
 * Debug-safe emit: probe-serialize the payload first so a circular/deep
 * structure crashes HERE with a clear tag instead of inside socket.io-parser.
 */
function safeEmit(io, tag, room, event, payload) {
  try {
    JSON.stringify(payload);
  } catch (err) {
    console.error(`[UNO] serialize fail [${tag}] for ${event}: ${err.message}`);
    console.error(`[UNO] payload keys: ${Object.keys(payload).join(',')}`);
    return;
  }
  room.emit(event, payload);
}

/**
 * Start a new UNO match (M11-02): shuffle, deal 7 cards, turn order
 */
export function startUnoGame(io, roomCode, { startMessage = null, roundNumber = 1 } = {}) {
  const code = roomCode.toUpperCase().trim();
  const room = getRoom(code);
  if (!room) return null;

  const players = room.players.map((p) => p.nickname);
  if (players.length < 2) {
    console.warn(`[UNO] Not enough players in room ${code} (${players.length})`);
    return null;
  }

  const deck = buildUnoDeck();
  const hands = {};
  for (const nick of players) {
    hands[nick] = deck.splice(0, 7);
  }

  // Flip a starting discard — keep flipping until a plain number card
  let top;
  do {
    top = deck.pop();
    if (top.type !== 'number') deck.splice(Math.floor(Math.random() * deck.length), 0, top);
  } while (top.type !== 'number');

  const gameState = {
    roomCode: code,
    players, // nicknames in seat order
    hands,
    deck,
    discard: [top],
    current: { color: top.color, type: top.type, value: top.value },
    direction: 1,
    turnIdx: 0,
    roundNumber,
    turnNumber: 1,
    status: 'in_game',
    winner: null,
    standings: [],
    pendingDraw: 0,
    unoPending: null, // nickname who must call UNO
    unoDeadline: null,
    unoTimer: null,
    turnDeadline: null,
    turnTimer: null,
    drawnCardId: null, // card drawn this turn that may still be played
    lastAction: startMessage, // human-readable feed line shown to the table
    isForfeit: false,
    forfeitedBy: null,
    isRematch: false
    // removed rematchVotes — was dead code, any single player could rematch
  };

  activeUnoGames.set(code, gameState);
  console.log(
    `[UNO] Match started in room ${code} with ${players.length} players. Top card: ${top.color} ${top.value}`
  );

  startTurnClock(io, gameState);
  broadcastUnoState(io, code);
  return gameState;
}

export function stopUnoGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeUnoGames.get(code);
  if (game) {
    if (game.unoTimer) clearTimeout(game.unoTimer);
    clearTurnClock(game);
    activeUnoGames.delete(code);
    console.log(`[UNO] Cleaned up game for room ${code}`);
  }
}

const mod = (n, m) => ((n % m) + m) % m;

/**
 * Advance turn by `steps` seats in current direction
 */
function advanceTurn(game, steps = 1) {
  game.turnIdx = mod(game.turnIdx + steps * game.direction, game.players.length);
  game.turnNumber += 1;
  game.drawnCardId = null;
}

/**
 * Turn clock: visible deadline on every seat, and a clock that resolves the turn
 * for a player who never acts.
 */
function clearTurnClock(game) {
  if (game.turnTimer) clearTimeout(game.turnTimer);
  game.turnTimer = null;
  game.turnDeadline = null;
}

function startTurnClock(io, game, ms = TURN_MS) {
  clearTurnClock(game);
  if (game.status !== 'in_game') return;
  const deadline = Date.now() + ms;
  game.turnDeadline = deadline;
  game.turnTimer = setTimeout(() => {
    const live = activeUnoGames.get(game.roomCode);
    if (!live || live !== game || live.status !== 'in_game' || live.turnDeadline !== deadline) return;
    resolveTurn(io, live, { timedOut: true });
  }, ms + 40);
  if (typeof game.turnTimer.unref === 'function') game.turnTimer.unref();
}

/**
 * Draw for the player whose clock ran out, then hand the turn on.
 * FIX: If the player already drew a playable card (drawnCardId set) and just
 * didn't act, don't draw again — just pass the turn.
 */
function resolveTurn(io, game, { timedOut = false } = {}) {
  const nickname = game.players[game.turnIdx];
  if (!nickname) return;

  // Already drew a playable card and didn't act — just pass, no extra draw
  if (game.drawnCardId) {
    game.lastAction = timedOut
      ? `${nickname} ran out of time and passed`
      : `${nickname} passed`;
    advanceTurn(game);
    startTurnClock(io, game);
    broadcastUnoState(io, game.roomCode);
    return;
  }

  const take = game.pendingDraw > 0 ? game.pendingDraw : 1;
  const drawn = drawCards(game, take);
  game.hands[nickname].push(...drawn);
  game.pendingDraw = 0;

  if (game.unoPending === nickname && (game.hands[nickname] || []).length !== 1) {
    if (game.unoTimer) clearTimeout(game.unoTimer);
    game.unoPending = null;
    game.unoDeadline = null;
    game.unoTimer = null;
  }

  game.lastAction = timedOut
    ? `${nickname} ran out of time — drew ${drawn.length} and passed`
    : `${nickname} drew ${drawn.length} and passed`;

  advanceTurn(game);
  startTurnClock(io, game);
  broadcastUnoState(io, game.roomCode);
}

/**
 * Draw N cards, reshuffling the discard pile (except top) when deck is empty
 */
function drawCards(game, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (game.deck.length === 0) {
      if (game.discard.length <= 1) break; // nothing left to reshuffle
      const top = game.discard.pop();
      game.deck = shuffle(game.discard);
      game.discard = [top];
      console.log(`[UNO] Deck exhausted in room ${game.roomCode}; reshuffled ${game.deck.length} cards`);
    }
    const card = game.deck.pop();
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

/**
 * Public state shared with everyone in the room (including spectators)
 */
function publicState(game) {
  return {
    roomCode: game.roomCode,
    status: game.status,
    winner: game.winner,
    standings: game.standings,
    players: game.players.map((nick, idx) => ({
      nickname: nick,
      handCount: (game.hands[nick] || []).length,
      isTurn: idx === game.turnIdx,
      atUno: (game.hands[nick] || []).length === 1 && game.unoPending !== nick
    })),
    topCard: game.discard[game.discard.length - 1],
    currentColor: game.current.color,
    direction: game.direction,
    roundNumber: game.roundNumber,
    turnNumber: game.turnNumber,
    deckSize: game.deck.length,
    discardSize: game.discard.length,
    pendingDraw: game.pendingDraw,
    unoPending: game.unoPending,
    unoCallMs: UNO_CALL_WINDOW_MS,
    turnEndsAt: game.turnDeadline,
    turnMs: TURN_MS,
    turnNickname: game.players[game.turnIdx] || null,
    lastAction: game.lastAction,
    isForfeit: Boolean(game.isForfeit),
    forfeitedBy: game.forfeitedBy
    // removed rematchVotes — was dead code
  };
}

/**
 * Broadcast personalized state to every seat (hands are private).
 * Also broadcasts public state to everyone (spectators use this).
 */
export function broadcastUnoState(io, roomCode) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return;

  const room = getRoom(game.roomCode);
  const base = publicState(game);

  // Public state to the whole room (spectators rely on this)
  safeEmit(io, 'room-wide', io.to(game.roomCode), 'uno:state', base);

  if (room) {
    for (const p of room.players) {
      const hand = game.hands[p.nickname] || [];
      const isYourTurn = game.players[game.turnIdx] === p.nickname;
      const mustDraw = isYourTurn && game.pendingDraw > 0;
      const session = {
        ...base,
        yourHand: hand,
        playableIds: mustDraw ? [] : hand.filter((c) => isPlayable(game, c, hand)).map((c) => c.id),
        isYourTurn,
        mustDraw,
        drawnCardId: isYourTurn ? game.drawnCardId : null,
        isSpectator: false
      };
      safeEmit(io, p.nickname, io.to(p.socketId), 'uno:session', session);
    }
  }
}

/**
 * M11-03: Is a card legally playable against the current pile?
 * REWRITTEN to support:
 *   - Draw stacking (+2/+4 on a pending draw)
 *   - Wild +4 restriction (can only play if no card matches current color)
 *
 * @param {object} game - game state
 * @param {object} card - card to check
 * @param {Array}  hand  - the player's hand (for Wild +4 restriction)
 */
export function isPlayable(game, card, hand) {
  // Stacking: when there's a pending draw, only +2 or +4 can be played.
  // During stacking, Wild +4 bypasses the color restriction so the chain
  // can continue.
  if (game.pendingDraw > 0) {
    return card.type === 'draw2' || card.type === 'wild4';
  }

  // Wild +4: can only play if you don't have a card matching the current color
  if (card.type === 'wild4') {
    if (hand && hand.some((c) => c.color === game.current.color)) return false;
    return true;
  }

  // Wild (non-+4): always playable
  if (card.color === 'wild') return true;

  // Color match
  if (card.color === game.current.color) return true;

  // Type match (e.g. any Skip on a Skip)
  if (card.type !== 'number' && card.type === game.current.type) return true;

  // Value match (7 on 7)
  if (card.type === 'number' && game.current.type === 'number' && card.value === game.current.value) {
    return true;
  }

  return false;
}

/**
 * M11-05: Finish the game, compute standings, persist scores (M11-14)
 */
async function finishGame(io, game, winnerNickname) {
  if (game.unoTimer) {
    clearTimeout(game.unoTimer);
    game.unoTimer = null;
  }
  clearTurnClock(game);
  game.unoPending = null;
  game.unoDeadline = null;
  game.status = 'finished';
  game.winner = winnerNickname;

  const standings = game.players
    .map((nick) => ({
      nickname: nick,
      cardsRemaining: (game.hands[nick] || []).length,
      cardPoints: (game.hands[nick] || []).reduce((sum, c) => sum + cardPoints(c), 0),
      isWinner: nick === winnerNickname
    }))
    .sort((a, b) => {
      if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
      return a.cardPoints - b.cardPoints;
    });
  game.standings = standings;

  const winner =
    game.players.find((n) => n === winnerNickname) || winnerNickname;
  const opponentsPoints = standings
    .filter((s) => s.nickname !== winner)
    .reduce((sum, s) => sum + s.cardPoints, 0);

  for (const standing of standings) {
    standing.score = standing.isWinner ? Math.max(opponentsPoints, 1) : 0;
  }
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  console.log(
    `[UNO] Player ${winner} won in room ${game.roomCode}!(+${opponentsPoints} pts from opponents' hands)`
  );

  try {
    await recordScore(winner, 'uno', Math.max(opponentsPoints, 1), true);
    for (const s of standings) {
      if (s.nickname !== winner) {
        await recordScore(s.nickname, 'uno', 0, false);
      }
    }
  } catch (err) {
    console.warn(`[UNO] Could not record score: ${err.message}`);
  }

  broadcastUnoState(io, game.roomCode);
  io.to(game.roomCode).emit('uno:end', {
    roomCode: game.roomCode,
    winner,
    standings,
    isForfeit: Boolean(game.isForfeit)
  });
}

/**
 * M11-03/04: Validate and apply a card play.
 * UPDATED: removes pendingDraw block (stacking allowed), uses += for stacking math.
 */
export async function playCard(io, roomCode, nickname, cardId, chosenColor) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return { success: false, error: 'No UNO game active in this room.' };
  if (game.status !== 'in_game') return { success: false, error: 'Game has already concluded.' };

  const seat = game.players.indexOf(nickname);
  if (seat === -1) return { success: false, error: 'You are not in this game.' };
  if (game.turnIdx !== seat) {
    return { success: false, error: `It's ${game.players[game.turnIdx]}'s turn!` };
  }
  // REMOVED: pendingDraw > 0 block — stacking is now allowed

  const hand = game.hands[nickname];
  const cardIdx = hand.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return { success: false, error: 'Card not in your hand.' };

  const card = hand[cardIdx];
  if (!isPlayable(game, card, hand)) {
    return { success: false, error: 'That card cannot be played right now.' };
  }

  // Drew this turn? That card is the only one you may play (or pass).
  if (game.drawnCardId && card.id !== game.drawnCardId) {
    return { success: false, error: 'You drew this turn — play the drawn card or pass.' };
  }

  if (card.color === 'wild') {
    if (!COLORS.includes(chosenColor)) {
      return { success: false, error: 'Choose a color for your wild card.' };
    }
  }

  // Apply the play
  hand.splice(cardIdx, 1);
  game.discard.push(card);

  // A previous player may still be inside the 5s UNO window while this turn is
  // being played. Do not clear that window here: the next player must still be
  // able to catch the missed call until the deadline expires.

  if (card.type === 'number') {
    game.current = { color: card.color, type: 'number', value: card.value };
    game.lastAction = `${nickname} played ${card.color} ${card.value}`;
    advanceTurn(game, 1);
  } else if (card.color === 'wild') {
    game.current = { color: chosenColor, type: 'wild', value: null };
    if (card.type === 'wild4') {
      // STACKING: add to existing pending (0 + 4 = 4, or 2 + 4 = 6, etc.)
      game.pendingDraw += 4;
      game.lastAction = `${nickname} played Wild +4 → ${chosenColor} (+${game.pendingDraw} pending)`;
    } else {
      game.lastAction = `${nickname} played Wild → colour ${chosenColor}`;
    }
    advanceTurn(game, 1);
  } else if (card.type === 'skip') {
    const skipped = game.players[mod(game.turnIdx + game.direction, game.players.length)];
    game.current = { color: card.color, type: 'skip', value: null };
    game.lastAction = `${nickname} played Skip — ${skipped} loses their turn`;
    advanceTurn(game, 2); // skip the next seat
  } else if (card.type === 'reverse') {
    game.direction *= -1;
    game.current = { color: card.color, type: 'reverse', value: null };
    game.lastAction =
      game.players.length === 2
        ? `${nickname} played Reverse — it acts as a Skip in a duel`
        : `${nickname} played Reverse — direction flipped`;
    // With 2 players, Reverse acts like a Skip
    advanceTurn(game, game.players.length === 2 ? 2 : 1);
  } else if (card.type === 'draw2') {
    game.current = { color: card.color, type: 'draw2', value: null };
    // STACKING: add to existing pending (0 + 2 = 2, or 4 + 2 = 6, etc.)
    game.pendingDraw += 2;
    game.lastAction = `${nickname} played +2 (+${game.pendingDraw} pending)`;
    advanceTurn(game, 1);
  }

  console.log(
    `[UNO] ${nickname} played ${card.color} ${card.type}${card.value != null ? ' ' + card.value : ''}` +
      (card.color === 'wild' ? ` → color ${chosenColor}` : '')
  );

  // M11-05: win check — empty hand
  if (hand.length === 0) {
    await finishGame(io, game, nickname);
    return { success: true, won: true };
  }

  // M11-11: must call UNO with 1 card left
  if (hand.length === 1) {
    game.unoPending = nickname;
    game.unoDeadline = Date.now() + UNO_CALL_WINDOW_MS;
    game.lastAction = `${nickname} is down to one card — call UNO!`;
    game.unoTimer = setTimeout(() => {
      const g = activeUnoGames.get(game.roomCode);
      if (!g || g.status !== 'in_game' || g.unoPending !== nickname) return;
      console.log(`[UNO] ${nickname} forgot to call UNO — penalty +2 cards`);
      penalizePlayer(io, g, nickname, 2);
    }, UNO_CALL_WINDOW_MS);
  }

  startTurnClock(io, game);
  broadcastUnoState(io, roomCode);
  // NOTE: never return the raw internal game state — it contains a Node Timeout
  return { success: true };
}

function penalizePlayer(io, game, nickname, count) {
  const hand = game.hands[nickname];
  if (!hand) return;
  hand.push(...drawCards(game, count));
  game.unoPending = null;
  game.unoDeadline = null;
  game.lastAction = `${nickname} did not call UNO — penalty +${count} cards`;
  if (game.unoTimer) {
    clearTimeout(game.unoTimer);
    game.unoTimer = null;
  }
  broadcastUnoState(io, game.roomCode);
}

/**
 * M11-09: draw action.
 * FIX: Classic UNO — can only draw when you have no playable cards.
 *       If pendingDraw > 0 → draw the stack and skip turn (absorb).
 *       Otherwise draw one card; if playable, turn continues; else pass.
 */
export function handleDraw(io, roomCode, nickname) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return { success: false, error: 'No UNO game active in this room.' };
  if (game.status !== 'in_game') return { success: false, error: 'Game has already concluded.' };

  const seat = game.players.indexOf(nickname);
  if (seat === -1) return { success: false, error: 'You are not in this game.' };
  if (game.turnIdx !== seat) {
    return { success: false, error: `It's ${game.players[game.turnIdx]}'s turn!` };
  }

  const wasPending = game.pendingDraw > 0;
  if (!wasPending && game.drawnCardId) {
    return { success: false, error: 'You already drew this turn — play the drawn card or pass.' };
  }

  // Classic UNO: can only draw if you have no playable cards
  if (!wasPending && !game.drawnCardId) {
    const hand = game.hands[nickname];
    const hasPlayable = hand.some((c) => isPlayable(game, c, hand));
    if (hasPlayable) {
      return { success: false, error: 'You have playable cards — play one!' };
    }
  }

  const take = wasPending ? game.pendingDraw : 1;
  game.pendingDraw = 0;

  const drawn = drawCards(game, take);
  game.hands[nickname].push(...drawn);
  console.log(`[UNO] ${nickname} drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}`);

  // Classic rule: the card you draw is yours to play if it matches. Otherwise the
  // turn is over and the seat behind you is up.
  const drawnCard = wasPending ? null : drawn[0];
  const canPlayDrawn = Boolean(drawnCard && isPlayable(game, drawnCard, game.hands[nickname]));

  if (wasPending) {
    game.lastAction = `${nickname} absorbed the draw stack (+${drawn.length}) and lost the turn`;
    advanceTurn(game, 1);
  } else if (canPlayDrawn) {
    game.drawnCardId = drawnCard.id;
    game.lastAction = `${nickname} drew a card — playable, their turn continues`;
  } else {
    game.lastAction = `${nickname} drew a card — nothing to play, turn passes`;
    advanceTurn(game, 1);
  }

  if (game.unoPending && game.unoPending !== nickname) {
    keepUnoWindow(io, game);
  }

  startTurnClock(io, game);
  broadcastUnoState(io, roomCode);
  return { success: true, drawn: drawn.length, drawnCard, canPlayDrawn, turnContinues: canPlayDrawn };
}

/**
 * Give up the turn (used after drawing a card you do not want to play).
 * FIX: Can only pass AFTER drawing — drawnCardId must be set.
 */
export function handlePass(io, roomCode, nickname) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return { success: false, error: 'No UNO game active in this room.' };
  if (game.status !== 'in_game') return { success: false, error: 'Game has already concluded.' };

  const seat = game.players.indexOf(nickname);
  if (seat === -1) return { success: false, error: 'You are not in this game.' };
  if (game.turnIdx !== seat) {
    return { success: false, error: `It's ${game.players[game.turnIdx]}'s turn!` };
  }

  // Can only pass after drawing a card
  if (!game.drawnCardId) {
    return { success: false, error: 'Draw a card first — you can only pass after drawing.' };
  }

  game.lastAction = `${nickname} passed`;
  advanceTurn(game);
  startTurnClock(io, game);
  broadcastUnoState(io, roomCode);
  return { success: true };
}

function keepUnoWindow(io, game) {
  if (game.unoTimer) {
    clearTimeout(game.unoTimer);
    game.unoTimer = null;
  }
  if (game.unoPending && game.status === 'in_game') {
    const nick = game.unoPending;
    const remaining = Math.max(game.unoDeadline - Date.now(), 500);
    game.unoTimer = setTimeout(() => {
      const g = activeUnoGames.get(game.roomCode);
      if (!g || g.status !== 'in_game' || g.unoPending !== nick) return;
      console.log(`[UNO] ${nick} forgot to call UNO — penalty +2 cards`);
      penalizePlayer(io, g, nick, 2);
    }, remaining);
  }
}

/**
 * M11-11: player calls UNO right after hitting 1 card
 */
export function callUno(io, roomCode, nickname) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return { success: false, error: 'No UNO game active in this room.' };

  if (game.unoPending !== nickname) {
    return { success: false, error: 'You do not need to call UNO right now.' };
  }
  if ((game.hands[nickname] || []).length !== 1) {
    return { success: false, error: 'UNO can only be called with exactly 1 card.' };
  }

  if (game.unoTimer) clearTimeout(game.unoTimer);
  game.unoTimer = null;
  game.unoPending = null;
  game.unoDeadline = null;
  game.lastAction = `${nickname} called UNO!`;

  console.log(`[UNO] ${nickname} called UNO!`);
  broadcastUnoState(io, roomCode);
  return { success: true };
}

/**
 * M11-11: catch a player who forgot to call UNO → they draw 2 as penalty
 */
export function catchUno(io, roomCode, nickname, target) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return { success: false, error: 'No UNO game active in this room.' };

  if (!game.unoPending) return { success: false, error: 'No pending UNO call to catch.' };
  if (game.unoPending !== target) {
    return { success: false, error: 'That player did not miss an UNO call.' };
  }
  if (nickname === target) {
    return { success: false, error: 'You cannot catch yourself — just call UNO!' };
  }

  console.log(`[UNO] ${nickname} caught ${target} — penalty +2 cards`);
  penalizePlayer(io, game, target, 2);
  return { success: true };
}

/**
 * M11-13: any player can restart the match for the whole room
 */
export function handleRematch(io, roomCode, nickname) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeUnoGames.get(code);
  if (!game) return { success: false, error: 'No UNO game found' };
  if (game.status === 'in_game') return { success: false, error: 'Game is still running.' };

  const room = getRoom(code);
  if (!room || room.players.length < 2) {
    return { success: false, error: 'Need 2+ players in the room to rematch.' };
  }

  const nextRound = (game.roundNumber || 1) + 1;
  stopUnoGame(code);
  const state = startUnoGame(io, code, {
    startMessage: `${nickname} started a rematch — round ${nextRound} is live!`,
    roundNumber: nextRound
  });
  if (state) state.isRematch = true;
  console.log(`[UNO] Rematch triggered in room ${code} by ${nickname}`);
  return { success: true, restarted: !!state };
}

/**
 * Handle a player leaving mid-game: remove their seat; last one standing wins.
 * FIX: direction-aware turn pointer — when the current player leaves, the next
 * turn goes to the correct seat based on game.direction.
 */
export function handleUnoPlayerLeave(io, roomCode, nickname) {
  const game = activeUnoGames.get(roomCode?.toUpperCase()?.trim());
  if (!game) return;

  const seat = game.players.indexOf(nickname);
  if (seat === -1) return;

  const wasCurrentTurn = game.turnIdx === seat;

  delete game.hands[nickname];
  game.players.splice(seat, 1);

  if (game.players.length > 0) {
    if (wasCurrentTurn) {
      // The current player left — point to the next player in current direction.
      // direction +1: the next player shifted into this seat index.
      // direction -1: the previous player is at (seat - 1) in the new array.
      game.turnIdx = mod(
        game.direction === -1 ? seat - 1 : seat,
        game.players.length
      );
    } else {
      // A non-current player left — fix the index shift
      game.turnIdx = mod(game.turnIdx > seat ? game.turnIdx - 1 : game.turnIdx, game.players.length);
    }
  }

  if (game.players.length === 1 && game.status === 'in_game') {
    game.isForfeit = true;
    game.forfeitedBy = nickname;
    console.log(`[UNO] ${nickname} left room ${roomCode}; ${game.players[0]} wins by forfeit`);
    finishGame(io, game, game.players[0]);
    return;
  }

  if (game.players.length < 2 && game.status === 'in_game') {
    stopUnoGame(roomCode);
    broadcastUnoState(io, roomCode);
    return;
  }

  if (game.unoPending === nickname) {
    if (game.unoTimer) clearTimeout(game.unoTimer);
    game.unoPending = null;
    game.unoDeadline = null;
    game.unoTimer = null;
  }
  if (game.players[game.turnIdx] === undefined) game.turnIdx = 0;
  startTurnClock(io, game);
  broadcastUnoState(io, game.roomCode);
}

/**
 * Register Socket.IO handlers for UNO
 */
export function registerUnoHandlers(io, socket) {
  // Fetch current personalized state
  socket.on('uno:get', ({ roomCode }, callback) => {
    let game = getUnoGame(roomCode);
    if (!game) {
      const room = getRoom(roomCode);
      if (room && room.gameType === 'uno' && room.players.length >= 2) {
        game = startUnoGame(io, roomCode);
      }
    }
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No game found' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true });
    broadcastUnoState(io, game.roomCode);
  });

  // Play a card (M11-08)
  socket.on('uno:play', async ({ roomCode, cardId, chosenColor }, callback) => {
    const room = getRoom(roomCode);
    const me = room?.players.find((p) => p.socketId === socket.id);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = await playCard(io, roomCode, me.nickname, cardId, chosenColor);
    if (typeof callback === 'function') callback(result);
  });

  // Pass the turn after drawing
  socket.on('uno:pass', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    const me = room?.players.find((p) => p.socketId === socket.id);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = handlePass(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });

  // Draw cards (M11-09)
  socket.on('uno:draw', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    const me = room?.players.find((p) => p.socketId === socket.id);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = handleDraw(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });

  // Call UNO (M11-11)
  socket.on('uno:call', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    const me = room?.players.find((p) => p.socketId === socket.id);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = callUno(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });

  // Catch a missed UNO call (M11-11 support)
  socket.on('uno:catch', ({ roomCode, target }, callback) => {
    const room = getRoom(roomCode);
    const me = room?.players.find((p) => p.socketId === socket.id);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = catchUno(io, roomCode, me.nickname, target);
    if (typeof callback === 'function') callback(result);
  });

  // Rematch (M11-13)
  socket.on('uno:rematch', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    const me = room?.players.find((p) => p.socketId === socket.id);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = handleRematch(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });
}
