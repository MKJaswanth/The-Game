# COMMUNICATE.md — AI Handoff Guide

> **For AI agents working in this repo.** Read this before touching any file.  
> Last updated: 2026-10-21

---

## What This Is

**The Game** — browser-based multiplayer gaming hub for a small team. Nickname-only auth, no passwords. React (Vite) frontend + Node.js/Express + Socket.IO backend + Supabase (PostgreSQL) for persistence.

**Core rule:** All game logic runs server-side. Clients only render. No client-side cheating.

---

## Current State

| Milestone | Status | Notes |
|---|---|---|
| M0 — Scaffold | Done | Vite, Express, Socket.IO, Supabase, Router, design system |
| M1 — Session & Navigation | Done | Home page, nickname validation, PlayerContext, lobby presence, auth guard |
| M2 — Game Hub & Rooms | Done | GameHub page, Room page, GameCard, room create/join/leave, host reassignment |
| M3 — Snake | Done | Canvas game, score submission, solo play from hub |
| M4 — Word Scramble | Done | Multiplayer word unscramble, 10 rounds, speed bonus scoring |
| M5 — Trivia Battle | Done | Live OpenTDB + 60 fallback questions, 15s timer, speed bonus, 10-step stepper, champion podium |
| M6 — Tic Tac Toe | Done | 3x3 turn-based duel, CyberBot AI, win/draw detection, instant rematch & role swap |
| M7 — Leaderboard | Done | Global top 20 rankings, 5 category tabs, rank medals, skeletons, player highlight, auto-refresh |
| M8 — QA & Deploy | Done | Phase 1 QA pass, Vercel & Render configs, DEPLOYMENT.md |
| M9 — Chat | Done | `ChatPanel`, `chat:message`, system join/leave messages |
| M10 — Profiles | Done | `/api/players/:nickname`, profile page, game history |
| M11 — UNO | Done | 108-card engine, wilds, draw stacks, UNO!/Catch!, standings |
| M12 — Flappy Race | Done | Server-authoritative 30 Hz race, ghost birds, crash spectating |
| M13 — Chess | Done | `chess.js` engine, legal-move maps, check/mate/draw, resign, rematch |
| M14 — Emoji Guessing | Done | 114 answers, rotating clue-giver, emoji composer, 5 rounds |

---

## What Was Just Built & Verified

- **All eight games are live.** Chess and Emoji Guessing completed Phase 2; the landing page and hub now read every game (title, player count, live state) from `client/src/data/games.js`, so those lists can never drift again.
- **Chess (`server/src/socket/games/chess.js`, `client/src/games/chess/Chess.jsx`):** server owns the `chess.js` instance and re-validates every move; broadcasts carry FEN plus the legal-move map for the side to move. Check/checkmate/stalemate/threefold/insufficient-material/fifty-move, draw offers, resign, forfeit-on-leave, colour-swapping rematches, and the server-authoritative inactivity clock are covered by `test-chess.mjs` (46 assertions) plus `test-chess-clock.mjs`.
- **Emoji Guessing (`server/src/socket/games/emoji.js`, `client/src/games/emoji/Emoji.jsx`):** 114-answer bank with hints, rotating clue-giver, answers delivered only to the clue-giver's socket, 30 s compose with authored-hint fallback, 60 s guesses, normalized matching, speed scoring (+40 for the clue-giver), five rounds and rematch voting — covered by `test-emoji.mjs`.
- **Single-service production mode:** `server/src/index.js` serves `client/dist` (with SPA fallback and immutable asset caching) whenever a build exists, so API + Socket.IO + UI share one origin. `render.yaml` builds the client and starts `node server/src/index.js`; `client/src/socket/socket.js` falls back to same-origin when it is not running behind the Vite dev/preview port. Verified at `http://localhost:4000` — deep links, `/health`, REST and websockets all served from one process.

## Next Up: Phase 2 QA & Deploy (Milestone M15)
- Finish the non-Supabase production hardening pass: room/chat acknowledgement deadlines, Chess inactivity clock, full regression, and mobile/PWA checks.
- Supabase configuration and production persistence are intentionally deferred until the user is ready.
- Re-run the suites, then deploy and verify the live URL when the production credentials are available.

---

## Key File Map

```
client/src/
├── context/PlayerContext.jsx    ← Global player state (nickname, socket, online players)
├── data/games.js                ← Game catalog (id, title, icon, min/max players, isAvailable)
├── pages/
│   ├── Home.jsx                 ← Landing (renders the whole catalog) + nickname entry
│   ├── GameHub.jsx              ← Game grid + create/join room modals
│   ├── Room.jsx                 ← Waiting room, host controls, game router
│   ├── Leaderboard.jsx          ← Top-20 board with per-game tabs
│   └── Profile.jsx              ← Player stats + game history
├── games/
│   ├── snake/Snake.jsx          ← Solo canvas game
│   ├── wordscramble/            ← Round-based word race
│   ├── trivia/                  ← Quiz battle
│   ├── tictactoe/               ← 1v1 / CyberBot
│   ├── uno/                     ← Card battle
│   ├── flappy/                  ← Server-synced race canvas
│   ├── chess/                   ← 8×8 board, legal-move maps
│   └── emoji/                   ← Emoji composer + guess race
├── components/                  ← Navbar, GameCard, Modal, Avatar, Badge, Button
└── socket/socket.js             ← Socket.IO client singleton

server/src/
├── index.js                     ← Express + Socket.IO + serves client/dist in production
├── socket/
│   ├── lobby.js                 ← player:join, lobby:update, disconnect handling
│   ├── rooms.js                 ← room:create/join/leave/start, game routing, cleanup
│   ├── chat.js                  ← chat:message + system messages
│   └── games/
│       ├── wordscramble.js      ├── trivia.js
│       ├── tictactoe.js         ├── uno.js
│       ├── flappy.js            ├── chess.js
│       └── emoji.js
├── routes/
│   ├── scores.js                ← POST /api/scores
│   ├── leaderboard.js           ← GET /api/leaderboard[/:gameType]
│   └── players.js               ← GET /api/players/:nickname (+ history)
├── data/
│   ├── words.json               ← Word bank (266 words)
│   ├── triviaQuestions.json     ← 60-question fallback bank
│   └── emojiAnswers.json        ← 114 emoji answers with hints
└── db/
    ├── schema.sql               ← Supabase migration
    └── supabase.js              ← Supabase client
```

---

## Patterns to Follow

1. **Server is truth** — every game action (guess, move, answer) is validated server-side via Socket.IO events with callbacks
2. **Socket events** — use `socket.emit(event, data, callback)` pattern; server responds via callback
3. **Room codes** — 6-char uppercase alphanumeric, generated server-side
4. **Styling** — CSS variables from `index.css` (graphite-arcade theme: `--bg`, `--surface`, brass `--accent`, Outfit + JetBrains Mono). No inline styles for colors — use the tokens
5. **Components** — use existing `Button`, `Card`, `Badge`, `Avatar`, `Modal` — don't reinvent
6. **State** — `PlayerContext` provides `{ nickname, socket, onlinePlayers, setNickname }`
7. **Docs before code** — update `TASKS.md` and `STATUS.md` after completing work

---

## What NOT to Touch

- `PROJECT.md`, `PRD.md`, `MILESTONES.md` — locked planning docs, only update via change control
- `server/src/db/schema.sql` — already migrated, don't modify without planning
- `client/src/index.css` — design tokens are locked
- `client/src/main.jsx` — entry point, don't modify
- Don't add new npm dependencies without checking with user first
- Don't modify completed game files (Snake, WordScramble) unless fixing a bug

---

## How to Verify Work

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend  
cd client && npm run dev
```

- Frontend: http://localhost:5173  (Network LAN: http://192.168.0.110:5173)
- Backend:  http://localhost:4000  (Network LAN: http://192.168.0.110:4000)
- Check browser console for errors
- Check server logs for Socket.IO connection confirmations

```bash
# Engine suites (backend must be running on :4000)
node test-uno.mjs        # 15 assertions
node test-flappy.mjs     # 21 assertions
node test-chess.mjs      # 46 assertions
node test-chess-clock.mjs # requires CHESS_TURN_MS <= 5000
node test-emoji.mjs      # 5 full rounds

# Production mode — one origin for API + sockets + UI
cd client && npm run build && cd ../server && npm start   # http://localhost:4000
```

Sparring bots for manual UI checks: `chess-bot.mjs <CODE>`, `emoji-bot.mjs <CODE>`, `flappy-bot.mjs`, `uno-bot.mjs`.
