# ✅ TASKS.md — The Game

> One task in **Doing** at a time. Move it to Done before picking the next.  
> All tasks map to a Milestone in `MILESTONES.md`.

---

## 🔄 Doing

| ID | Task | Milestone |
|---|---|---|
| M6-01 | Server: TTT engine — board, turns, move validation | M6 |

---

## 📋 Todo

### M6 — Tic Tac Toe
| ID | Task |
|---|---|
| M6-02 | Server: enforce turn order |
| M6-03 | Server: detect win (8 combos) + draw |
| M6-04 | Server: emit `ttt:state` |
| M6-05 | Client: 3x3 clickable grid |
| M6-06 | Client: emit `ttt:move` |
| M6-07 | Client: show whose turn it is |
| M6-08 | Client: disable board on opponent's turn |
| M6-09 | Client: highlight winning cells |
| M6-10 | End screen — Rematch / Lobby |
| M6-11 | Rematch: reset board, swap X/O |
| M6-12 | Submit win/loss to Supabase |

### M7 — Leaderboard
| ID | Task |
|---|---|
| M7-01 | Build `GET /api/leaderboard` route |
| M7-02 | Query Supabase, join players + scores, top 20 |
| M7-03 | Build `GET /api/leaderboard/:gameType` |
| M7-04 | Leaderboard page UI — table with all columns |
| M7-05 | Filter tabs: All \| Snake \| Word Scramble \| Trivia \| TTT |
| M7-06 | Loading skeleton state |
| M7-07 | Empty state message |
| M7-08 | Highlight current player's rows |
| M7-09 | Auto-refresh every 60 seconds |

### M8 — Phase 1 QA & Deploy
| ID | Task |
|---|---|
| M8-01 | E2E play-through: Snake → score on leaderboard |
| M8-02 | E2E play-through: Word Scramble (2 players) |
| M8-03 | E2E play-through: Trivia (2–3 players) |
| M8-04 | E2E play-through: Tic Tac Toe + rematch |
| M8-05 | Test disconnect scenarios |
| M8-06 | Test edge cases (bad codes, duplicate nicknames) |
| M8-07 | Test on Chrome, Firefox, Edge |
| M8-08 | Mobile smoke test (360px) |
| M8-09 | Deploy frontend to Vercel |
| M8-10 | Deploy backend to Render/Railway |
| M8-11 | Set production env variables |
| M8-12 | E2E test on live deployed URL |
| M8-13 | Share URL with team 🎉 |

### Phase 2 & 3 — M9 through M20
> Tasks for M9–M20 will be broken out here when Phase 1 is complete.  
> See `MILESTONES.md` for the full Phase 2 & 3 task breakdown.

---

## ✅ Done

| ID | Task | Milestone | Completed |
|---|---|---|---|
| — | Project brainstorm & architecture decision | Pre-dev | 2026-10-06 |
| — | Created `PROJECT.md` | Pre-dev | 2026-10-06 |
| — | Created `PRD.md` | Pre-dev | 2026-10-06 |
| — | Created `USER_STORIES.md` | Pre-dev | 2026-10-06 |
| — | Created `MILESTONES.md` | Pre-dev | 2026-10-06 |
| — | Created `TASKS.md` | Pre-dev | 2026-10-06 |
| — | Created `STATUS.md` | Pre-dev | 2026-10-06 |
| M0-01 | Initialize Vite + React client (`client/`) | M0 | 2026-10-06 |
| M0-02 | Initialize Node.js + Express server (`server/`) | M0 | 2026-10-06 |
| M0-03 | Install and wire Socket.IO on client and server | M0 | 2026-10-06 |
| M0-04 | Set up Supabase project + run DB schema migrations | M0 | 2026-10-06 |
| M0-05 | Create `.env.example` with all required variables | M0 | 2026-10-06 |
| M0-06 | Set up React Router with placeholder pages | M0 | 2026-10-06 |
| M0-07 | Create global `index.css` with all design tokens | M0 | 2026-10-06 |
| M0-08 | Load Outfit font from Google Fonts | M0 | 2026-10-06 |
| M0-09 | Create base component stubs: Navbar, Button, Avatar, Badge, Modal | M0 | 2026-10-06 |
| M0-10 | Verify: both servers start, Socket.IO handshake, Supabase ping | M0 | 2026-10-06 |
| M1-01 | Build Home page — headline, nickname input, join button | M1 | 2026-10-06 |
| M1-02 | Validate nickname (3–20 chars, alphanumeric) with inline errors | M1 | 2026-10-06 |
| M1-03 | On join: emit `player:join` socket event | M1 | 2026-10-06 |
| M1-04 | Server: handle `player:join`, add to active players map | M1 | 2026-10-06 |
| M1-05 | Server: reject duplicate nicknames with error event | M1 | 2026-10-06 |
| M1-06 | Server: broadcast `lobby:update` to all clients on join/leave | M1 | 2026-10-06 |
| M1-07 | Create `PlayerContext` — store nickname globally in React | M1 | 2026-10-06 |
| M1-08 | Save nickname to `localStorage` on successful join | M1 | 2026-10-06 |
| M1-09 | Pre-fill nickname from `localStorage` on home page load | M1 | 2026-10-06 |
| M1-10 | Handle socket disconnect — remove player from active map | M1 | 2026-10-06 |
| M1-11 | Build Navbar — logo, nav links, nickname display | M1 | 2026-10-06 |
| M1-12 | Implement React Router navigation (no page reloads) | M1 | 2026-10-06 |
| M1-13 | Redirect unauthenticated users from `/hub` to `/` | M1 | 2026-10-06 |
| M1-14 | Apply global dark theme, hover states, base animations | M1 | 2026-10-06 |
| M2-01 | Build Game Hub page with game card grid | M2 | 2026-10-06 |
| M2-02 | Build `GameCard` component | M2 | 2026-10-06 |
| M2-03 | Hover animations on game cards | M2 | 2026-10-06 |
| M2-04 | Game card click → modal: Create / Join / Quick Play | M2 | 2026-10-06 |
| M2-05 | "Create Room" → emit `room:create` → receive room code | M2 | 2026-10-06 |
| M2-06 | Server: generate 6-char room code | M2 | 2026-10-06 |
| M2-07 | Navigate to `/room/:code` after room created | M2 | 2026-10-06 |
| M2-08 | Copy-to-clipboard button for room code | M2 | 2026-10-06 |
| M2-09 | "Join Room" → code input → emit `room:join` | M2 | 2026-10-06 |
| M2-10 | Server: validate code, capacity, game status | M2 | 2026-10-06 |
| M2-11 | Build Room page — player list, code, host controls | M2 | 2026-10-06 |
| M2-12 | Room player list updates in real-time via `room:state` | M2 | 2026-10-06 |
| M2-13 | Show host badge (👑) on host | M2 | 2026-10-06 |
| M2-14 | "Start Game" — host only, disabled if min players not met | M2 | 2026-10-06 |
| M2-15 | Server: validate start, emit `game:start` to all | M2 | 2026-10-06 |
| M2-16 | "Leave Room" — return to hub | M2 | 2026-10-06 |
| M2-17 | Server: reassign host on leave, broadcast state | M2 | 2026-10-06 |
| M2-18 | Coming-soon cards shown as disabled | M2 | 2026-10-06 |
| M3-01 | Build Snake game canvas component | M3 | 2026-10-06 |
| M3-02 | Grid + snake movement loop | M3 | 2026-10-06 |
| M3-03 | Arrow key + WASD input | M3 | 2026-10-06 |
| M3-04 | Food random spawn | M3 | 2026-10-06 |
| M3-05 | Collision detection — wall and self | M3 | 2026-10-06 |
| M3-06 | Live score display | M3 | 2026-10-06 |
| M3-07 | Speed increases every 5 food items | M3 | 2026-10-06 |
| M3-08 | Game Over screen + restart | M3 | 2026-10-06 |
| M3-09 | Auto-submit score to `/api/scores` on game over | M3 | 2026-10-06 |
| M3-10 | "Score saved!" toast notification | M3 | 2026-10-06 |
| M3-11 | Handle API failure gracefully | M3 | 2026-10-06 |
| M3-12 | Snake accessible from hub (single-player, no room) | M3 | 2026-10-06 |
| M4-01 | Create word bank JSON (200+ words) | M4 | 2026-10-06 |
| M4-02 | Server: Word Scramble engine | M4 | 2026-10-06 |
| M4-03 | Server: emit `scramble:round` to all players | M4 | 2026-10-06 |
| M4-04 | Client: scrambled letters display + text input | M4 | 2026-10-06 |
| M4-05 | Client: 30-second countdown timer | M4 | 2026-10-06 |
| M4-06 | Client: emit `scramble:guess` on submit | M4 | 2026-10-06 |
| M4-07 | Server: validate guess, award speed bonus | M4 | 2026-10-06 |
| M4-08 | Server: emit `scramble:result` after round | M4 | 2026-10-06 |
| M4-09 | 10 rounds → emit `scramble:end` | M4 | 2026-10-06 |
| M4-10 | Final screen — winner + Play Again | M4 | 2026-10-06 |
| M4-11 | Submit scores to Supabase | M4 | 2026-10-06 |
| M4-12 | Client: Visual 10-step round stepper, "X rounds left" badge, and Final Round alerts | M4 | 2026-10-07 |
| M5-01 | Create local fallback question bank JSON (60+ questions) | M5 | 2026-10-07 |
| M5-02 | Integrate Open Trivia DB API client with fallback | M5 | 2026-10-07 |
| M5-03 | Server: trivia engine per room (shuffled questions, round state) | M5 | 2026-10-07 |
| M5-04 | Server: emit `trivia:question` simultaneously | M5 | 2026-10-07 |
| M5-05 | Client: question screen + 4 answer buttons (A, B, C, D) | M5 | 2026-10-07 |
| M5-06 | Client: 15-second animated countdown timer with urgency pulse | M5 | 2026-10-07 |
| M5-06b | Client: Visual 10-step question stepper & questions remaining tracker | M5 | 2026-10-07 |
| M5-07 | Client: emit `trivia:answer`, lock buttons & keyboard shortcuts (1-4) | M5 | 2026-10-07 |
| M5-08 | Server: collect answers, calculate points + speed bonus, emit `trivia:result` | M5 | 2026-10-07 |
| M5-09 | Client: per-question result screen (correct answer reveal + score) | M5 | 2026-10-07 |
| M5-10 | Server: advance to next question after 3s result pause | M5 | 2026-10-07 |
| M5-11 | After Q10: emit `trivia:end` with final podium & winner | M5 | 2026-10-07 |
| M5-12 | Client: final screen — champion trophy, rankings table, Play Again | M5 | 2026-10-07 |
| M5-13 | Submit all player scores to Supabase on game end | M5 | 2026-10-07 |



