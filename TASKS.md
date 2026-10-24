# ✅ TASKS.md — The Game

> One task in **Doing** at a time. Move it to Done before picking the next.  
> All tasks map to a Milestone in `MILESTONES.md`.

---

## 🔄 Doing

*Nothing in progress — M12 is complete; M13 (Chess) is next.*

---

## 📋 Todo

### M13 — Chess (write stories before starting)
| ID | Task |
|---|---|
| M13-01 | Integrate `chess.js` for move validation |
| M13-02 | Server chess engine — board state, turn tracking |
| M13-03 | Validate moves server-side, broadcast board |
| M13-04 | Detect check / checkmate / stalemate / draw |
| M13-05 | Client 8x8 board render |
| M13-06 | Piece glyphs + drag/click movement |
| M13-07 | Legal-move highlighting + king-in-check highlight |
| M13-08 | Draw offer + accept/decline |
| M13-09 | End screen + Play Again |
| M13-10 | Persist result to Supabase |

### Phase 2 & 3 — M14 through M20
> Tasks for M13–M20 will be broken out when starting each milestone.  
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
| M6-01 | Server: TTT engine — board, turns, move validation | M6 | 2026-10-07 |
| M6-02 | Server: enforce turn order | M6 | 2026-10-07 |
| M6-03 | Server: detect win (8 combos) + draw | M6 | 2026-10-07 |
| M6-04 | Server: emit `ttt:state` | M6 | 2026-10-07 |
| M6-05 | Client: 3x3 clickable grid | M6 | 2026-10-08 |
| M6-06 | Client: emit `ttt:move` | M6 | 2026-10-08 |
| M6-07 | Client: show whose turn it is | M6 | 2026-10-08 |
| M6-08 | Client: disable board on opponent's turn | M6 | 2026-10-08 |
| M6-09 | Client: highlight winning cells | M6 | 2026-10-08 |
| M6-10 | End screen — Rematch / Lobby | M6 | 2026-10-08 |
| M6-11 | Rematch: reset board, swap X/O | M6 | 2026-10-08 |
| M6-12 | Submit win/loss to Supabase | M6 | 2026-10-08 |
| M7-01 | Build `GET /api/leaderboard` route | M7 | 2026-10-09 |
| M7-02 | Query Supabase, join players + scores, top 20 | M7 | 2026-10-09 |
| M7-03 | Build `GET /api/leaderboard/:gameType` | M7 | 2026-10-09 |
| M7-04 | Leaderboard page UI — table with all columns | M7 | 2026-10-09 |
| M7-05 | Filter tabs: All \| Snake \| Word Scramble \| Trivia \| TTT | M7 | 2026-10-09 |
| M7-06 | Loading skeleton state | M7 | 2026-10-09 |
| M7-07 | Empty state message | M7 | 2026-10-09 |
| M7-08 | Highlight current player's rows | M7 | 2026-10-09 |
| M7-09 | Auto-refresh every 60 seconds | M7 | 2026-10-09 |
| M8-01 | E2E play-through: Snake → score on leaderboard | M8 | 2026-10-09 |
| M8-02 | E2E play-through: Word Scramble (2 players) | M8 | 2026-10-09 |
| M8-03 | E2E play-through: Trivia (2–3 players) | M8 | 2026-10-09 |
| M8-04 | E2E play-through: Tic Tac Toe + rematch | M8 | 2026-10-09 |
| M8-05 | Test disconnect scenarios (host reassignment, player leave) | M8 | 2026-10-09 |
| M8-06 | Test edge cases (bad room codes, duplicate nicknames) | M8 | 2026-10-09 |
| M8-07 | Test on Chrome, Firefox, Edge compatibility | M8 | 2026-10-09 |
| M8-08 | Mobile smoke test (360px min-width) | M8 | 2026-10-09 |
| M8-09 | Deploy frontend configuration (Vercel SPA rewrites & build validation) | M8 | 2026-10-09 |
| M8-10 | Deploy backend configuration (Render/Railway configs & scripts) | M8 | 2026-10-09 |
| M8-11 | Set production environment variables (.env.example & configs) | M8 | 2026-10-09 |
| M8-12 | E2E QA automated suite verification (100% pass) | M8 | 2026-10-09 |
| M8-13 | Create DEPLOYMENT.md runbook & share guide | M8 | 2026-10-09 |
| M9-01 | Add chat sidebar/panel to the Room page UI | M9 | 2026-10-12 |
| M9-02 | Socket event `chat:message` — client sends, server broadcasts to room | M9 | 2026-10-12 |
| M9-03 | Message display: nickname + avatar + message + timestamp | M9 | 2026-10-12 |
| M9-04 | Auto-scroll to latest message | M9 | 2026-10-12 |
| M9-05 | System messages: "[Player] joined the room", "[Player] left" | M9 | 2026-10-12 |
| M9-06 | Enter key submits message, input clears after send | M9 | 2026-10-12 |
| M9-07 | Max message length: 200 chars (validated client + server side) | M9 | 2026-10-12 |
| M9-08 | Chat is hidden during active gameplay, visible in lobby/waiting screen | M9 | 2026-10-12 |
| M11-01 | UNO card data model (color, type, value, card points) | M11 | 2026-10-20 |
| M11-02 | Server: UNO engine — 108-card shuffle, deal 7, turn management | M11 | 2026-10-20 |
| M11-03 | Server: validate + apply plays (color/number match, wilds) | M11 | 2026-10-20 |
| M11-04 | Server: Skip, Reverse, Draw 2, Wild, Wild +4 effects | M11 | 2026-10-20 |
| M11-05 | Server: win detection + `uno:end` with standings | M11 | 2026-10-20 |
| M11-06 | Client: hand UI with playable-card highlighting | M11 | 2026-10-20 |
| M11-07 | Client: center pile (top card + active color) | M11 | 2026-10-20 |
| M11-08 | Client: `uno:play` on card click | M11 | 2026-10-20 |
| M11-09 | Client: draw button + pending draw-stack handling | M11 | 2026-10-20 |
| M11-10 | Client: wild color picker dialog | M11 | 2026-10-20 |
| M11-11 | Client: UNO! call button + Catch! penalty flow | M11 | 2026-10-20 |
| M11-12 | Client: face-down opponent card stacks with live counts | M11 | 2026-10-20 |
| M11-13 | Final screen — winner podium, standings, Play Again | M11 | 2026-10-20 |
| M11-14 | Submit winner + loser scores to Supabase | M11 | 2026-10-20 |
| M11-15 | Server: per-turn clock (`turnEndsAt`) with auto draw-and-pass on timeout | M11 | 2026-10-23 |
| M11-16 | Server: classic draw-then-play rule + explicit `uno:pass` action | M11 | 2026-10-23 |
| M11-17 | Client: turn countdown bar, no-playable-card hint, drawn-card banner with pass link | M11 | 2026-10-23 |
| M11-18 | Client: table action feed (plays, skips, UNO calls, penalties) + UNO badge in the rail | M11 | 2026-10-23 |
| M12-01 | Server-authoritative Flappy flight model (gravity, flap, ground/ceiling) | M12 | 2026-10-21 |
| M12-02 | Pipe course generation, gap tuning, scroll ramp | M12 | 2026-10-21 |
| M12-03 | Collision detection — pipe columns and ground | M12 | 2026-10-21 |
| M12-04 | Score = pipes passed per bird | M12 | 2026-10-21 |
| M12-05 | Canvas client with ghost rivals, HUD chips, crash spectating | M12 | 2026-10-21 |
| M12-06 | `flappy:state` broadcast at 30 Hz with client-side interpolation | M12 | 2026-10-21 |
| M12-07 | Crash detection, last-bird-standing tracking, leave/disconnect handling | M12 | 2026-10-21 |
| M12-08 | Winner = survivor, then pipes, then survival time | M12 | 2026-10-21 |
| M12-09 | Ranked results screen + Race Again voting | M12 | 2026-10-21 |
| M12-10 | Persist every racer's score + leaderboard/profile/label wiring | M12 | 2026-10-21 |
| M13-01 | Add `chess.js` to the server for full legal-move validation | M13 | 2026-10-21 |
| M13-02 | Server: chess engine — board state, seats, turn tracking, rematch colour swap | M13 | 2026-10-21 |
| M13-03 | Server: `chess:move` validation + FEN snapshot with legal-move map | M13 | 2026-10-21 |
| M13-04 | Server: check, checkmate, stalemate, repetition, insufficient material, fifty-move draw | M13 | 2026-10-21 |
| M13-05 | Client: 8×8 board with alternating squares, rank/file labels, colour-aware flip | M13 | 2026-10-21 |
| M13-06 | Client: Unicode piece glyphs with light/dark contrast treatment | M13 | 2026-10-21 |
| M13-07 | Client: select piece → legal dots/capture rings → click to move | M13 | 2026-10-21 |
| M13-08 | Client: `chess:move` with from/to (+ promotion piece) | M13 | 2026-10-21 |
| M13-09 | Client: check pulse on the king + status line warning | M13 | 2026-10-21 |
| M13-10 | Result panel — mate/draw/resign messaging, Rematch, Leave | M13 | 2026-10-21 |
| M13-11 | Draw offer + accept/decline flow, resign confirmation, forfeit on leave | M13 | 2026-10-21 |
| M13-12 | Persist results to Supabase (100/50/0) + leaderboard/profile/label wiring | M13 | 2026-10-21 |
| M14-01 | Author a 114-entry emoji answer bank with hints and categories | M14 | 2026-10-21 |
| M14-02 | Server: round engine — rotating clue-giver, secret answers, per-socket answer delivery | M14 | 2026-10-21 |
| M14-03 | Client: emoji composer — 8-category palette, live preview, undo/clear | M14 | 2026-10-21 |
| M14-04 | Client: submit clue → broadcast, 30 s compose timer with authored-hint fallback | M14 | 2026-10-21 |
| M14-05 | Client: clue display, 60 s timer bar, guess input + live guess feed | M14 | 2026-10-21 |
| M14-06 | Server: normalized guess matching (case, punctuation, articles, plurals) | M14 | 2026-10-21 |
| M14-07 | Server: speed-scaled 60–100 points for solving, +40 for the clue-giver | M14 | 2026-10-21 |
| M14-08 | Reveal phase with the answer, round winner and 5 s intermission | M14 | 2026-10-21 |
| M14-09 | Five rounds with clue-giver rotation and a live score rail | M14 | 2026-10-21 |
| M14-10 | Final standings screen with winner, Play Again voting, Leave | M14 | 2026-10-21 |
| M14-11 | Persist scores to Supabase + leaderboard/profile/label wiring | M14 | 2026-10-21 |

| M15-01 | Fix the live-only Trivia crash (`useCallback` used without an import in `Trivia.jsx`) | M15 | 2026-10-24 |
| M15-02 | Add `test-quiz-games.mjs` — Trivia (solo + 2P) and Word Scramble (solo) played to completion over Socket.IO | M15 | 2026-10-24 |
| M15-03 | Verify the deployed origin in a browser: UNO update, Trivia, Word Scramble, Tic Tac Toe vs bot, Chess lobby | M15 | 2026-10-24 |
