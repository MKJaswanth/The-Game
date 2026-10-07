# COMMUNICATE.md — AI Handoff Guide

> **For AI agents working in this repo.** Read this before touching any file.  
> Last updated: 2026-10-07

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
| M6 — Tic Tac Toe | **In Progress** | Starting server TTT engine & turn logic (M6-01) |
| M7 — Leaderboard | Partial | API route exists, page UI is stub |
| M8 — QA & Deploy | Not Started | |

---

## What Was Just Built & Verified

- **Trivia Battle (Milestone M5 — 100% Complete & Verified Live):**
  - Fallback bank: `triviaQuestions.json` (60 fact-checked questions across 5 categories).
  - Live API: `triviaService.js` fetches from Open Trivia DB with HTML entity decoding, option shuffling, and automatic fallback.
  - Server engine: `server/src/socket/games/trivia.js` with synchronized 15s timers, 4 options A/B/C/D, speed bonus scoring (100 base + 10 pts/sec remaining), early advance on all-answered, per-question reveals, 10 questions end flow, and auto score saving.
  - Client component: `Trivia.jsx` + `trivia.css` with 10-step question stepper (`QUESTIONS: [✓]...[10]`), remaining questions counter, `🔥 FINAL QUESTION` alert, live room scoreboard, answer locking, keyboard shortcuts (1-4 / A-D), and champion podium.
  - Verified live in browser from Q1 to Q10 with visual proof screenshot.

- **Round Tracker & Game End Indicators (M4-12 & M5-06b standard):**
  - Live 10-step visual stepper: `ROUNDS: [✓][✓][3]...[10]` showing round progression.
  - Remaining rounds indicator: `({totalRounds - round} rounds left)`.
  - Game conclusion subtext & urgent final round banner: `🔥 FINAL ROUND — Game concludes after this word/question!`.
  - Room page dynamic match format & rules banner customized per game.

## Next Up: M6 — Tic Tac Toe
- Server TTT engine (`server/src/socket/games/tictactoe.js`) — board matrix, turn alternation, win detection (8 combos) & draw
- Client `TicTacToe.jsx` — 3x3 interactive grid, turn indicators, winning line highlight
- Rematch mechanism with X/O swap and score persistence

---

## Key File Map

```
client/src/
├── context/PlayerContext.jsx    ← Global player state (nickname, socket, online players)
├── data/games.js                ← Game catalog (id, title, icon, min/max players, isAvailable)
├── pages/
│   ├── Home.jsx                 ← Landing + nickname entry
│   ├── GameHub.jsx              ← Game grid + create/join room modals
│   ├── Room.jsx                 ← Waiting room + host controls
│   └── Leaderboard.jsx          ← STUB — needs full UI
├── games/
│   ├── snake/Snake.jsx          ← Solo canvas game
│   └── wordscramble/WordScramble.jsx  ← Multiplayer word game
├── components/                  ← Navbar, GameCard, Modal, Avatar, Badge, Button
└── socket/socket.js             ← Socket.IO client singleton

server/src/
├── socket/
│   ├── lobby.js                 ← player:join, lobby:update, disconnect handling
│   ├── rooms.js                 ← room:create, room:join, room:leave, room:state
│   └── games/
│       └── wordscramble.js      ← Word Scramble engine (rounds, scoring, timers)
├── routes/
│   ├── scores.js                ← POST /api/scores
│   └── leaderboard.js           ← GET /api/leaderboard
├── data/
│   └── words.json               ← Word bank (266 words)
└── db/
    ├── schema.sql               ← Supabase migration
    └── supabase.js              ← Supabase client
```

---

## Patterns to Follow

1. **Server is truth** — every game action (guess, move, answer) is validated server-side via Socket.IO events with callbacks
2. **Socket events** — use `socket.emit(event, data, callback)` pattern; server responds via callback
3. **Room codes** — 6-char uppercase alphanumeric, generated server-side
4. **Styling** — CSS variables from `index.css` (dark theme, violet #7c3aed, cyan #06b6d4, Outfit font). No inline styles for colors — use `var(--color-*)`
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
