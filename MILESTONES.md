# 🏁 Milestones & Coverage Plan — The Game

**Version:** 2.0  
**Date:** 2026-10-06  
**Status:** Active  

> This document is the **complete, locked build order** for The Game — covering all 3 phases from first scaffold to final production release.  
> Nothing gets built outside of this plan without updating this doc first.  
> Every milestone must be fully completed and verified before the next begins.

---

## 🔒 Ground Rules

1. **Sequential only** — Milestones are completed in order. No jumping ahead.
2. **Gate checks** — Each milestone has a Definition of Done (DoD). All checkboxes must be ticked before proceeding.
3. **No scope creep** — Any new idea goes to a `BACKLOG.md` note, not into the current milestone.
4. **Story traceability** — Every task references a User Story ID from `USER_STORIES.md`.
5. **AI rule** — When asking AI to build something, always paste the relevant milestone + story IDs. AI must not invent features not in this list.
6. **Phase gates** — A full QA milestone exists at the end of each phase before moving to the next.

---

## 📊 Full Milestone Overview

```
PHASE 1 — MVP
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
Setup  Auth  Rooms Snake Word  Triv  TTT  LBoard QA+Deploy

PHASE 2 — GROWTH
M9 → M10 → M11 → M12 → M13 → M14 → M15
Chat  Prof   UNO  Flap  Chess Emoji  QA+Deploy

PHASE 3 — ADVANCED & POLISH
M16 → M17 → M18 → M19 → M20
Draw  Ludo  Sound  PWA  Final QA
```

| Milestone | Phase | Name | Stories | Status |
|---|---|---|---|---|
| **M0** | 1 | Project Scaffold & Design System | — | ✅ |
| **M1** | 1 | Core Session & Navigation | US-001–003, US-018–019 | ✅ |
| **M2** | 1 | Game Hub & Room System | US-004–009 | ✅ |
| **M3** | 1 | Snake Game | US-010–011 | ✅ |
| **M4** | 1 | Word Scramble Game | US-020–021 | 🔲 |
| **M5** | 1 | Trivia Battle | US-012–013 | 🔲 |
| **M6** | 1 | Tic Tac Toe | US-014–015 | 🔲 |
| **M7** | 1 | Leaderboard | US-016–017 | 🔲 |
| **M8** | 1 | Phase 1 QA & Initial Deploy | All Phase 1 | 🔲 |
| **M9** | 2 | In-Room Chat | US-022 | 🔲 |
| **M10** | 2 | Player Profiles & Game History | US-023–024 | 🔲 |
| **M11** | 2 | UNO Card Game | US-025–026 | 🔲 |
| **M12** | 2 | Flappy Race | US-027 | 🔲 |
| **M13** | 2 | Chess | US-028–029 | 🔲 |
| **M14** | 2 | Emoji Guessing Game | US-030–031 | 🔲 |
| **M15** | 2 | Phase 2 QA & Deploy Update | All Phase 2 | 🔲 |
| **M16** | 3 | Skribbl Drawing Game | US-032–033 | 🔲 |
| **M17** | 3 | Ludo Board Game | US-034–035 | 🔲 |
| **M18** | 3 | Sound Effects & Music | US-036 | 🔲 |
| **M19** | 3 | Mobile Responsiveness & PWA | US-037–038 | 🔲 |
| **M20** | 3 | Final QA & Production Polish | All | 🔲 |

> **Total: 20 Milestones | 3 Phases | 10 Games | Full End-to-End Coverage**

---

---

# 🟣 PHASE 1 — MVP
> **Goal:** A working gaming hub with 4 games, live lobby, and leaderboard — deployed and shared with the team.

---

## M0 — Project Scaffold & Design System
**Goal:** Empty but fully wired project. Both servers run. Design tokens defined. No visible UI yet.  
**Blocks:** Everything.

### Tasks
| # | Task | PRD Ref | Status |
|---|---|---|---|
| M0-01 | Initialize Vite + React client (`client/`) | — | ✅ |
| M0-02 | Initialize Node.js + Express server (`server/`) | — | ✅ |
| M0-03 | Install and wire Socket.IO on client and server | — | ✅ |
| M0-04 | Set up Supabase project and run DB schema migrations (players, scores, game_sessions) | PRD §5.1 | ✅ |
| M0-05 | Create `.env.example` with all required variables | PRD Env Vars | ✅ |
| M0-06 | Set up React Router with placeholder pages: `/`, `/hub`, `/room/:code`, `/leaderboard` | — | ✅ |
| M0-07 | Create global `index.css` — all design tokens (colors, fonts, radius, shadows, spacing) | PRD UI-01/02 | ✅ |
| M0-08 | Load Outfit font from Google Fonts | PRD UI-02 | ✅ |
| M0-09 | Create base component stubs: `Navbar`, `Button`, `Avatar`, `Badge`, `Modal` | — | ✅ |
| M0-10 | Verify: both servers start, Socket.IO handshake succeeds, Supabase ping returns OK | — | ✅ |

### ✅ Definition of Done
- [x] `npm run dev` in `/client` → Vite on port 5173
- [x] `npm run dev` in `/server` → Express on port 4000
- [x] Browser console shows Socket.IO connected
- [x] Supabase connection verified with no errors
- [x] All 4 routes render without crashing (even if blank)
- [x] CSS variables visible in browser dev tools

---

## M1 — Core Session & Navigation
**Goal:** Player can enter a nickname, join the hub, and be tracked live.  
**Stories:** US-001, US-002, US-003, US-018, US-019  
**Blocks:** M2

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M1-01 | Build Home page — headline, nickname input, join button | US-001 | ✅ |
| M1-02 | Validate nickname (3–20 chars, alphanumeric) with inline errors | US-001 | ✅ |
| M1-03 | On join: emit `player:join` socket event | US-001 | ✅ |
| M1-04 | Server: handle `player:join`, add to active players map | US-001 | ✅ |
| M1-05 | Server: reject duplicate nicknames with error event | US-001 | ✅ |
| M1-06 | Server: broadcast `lobby:update` to all clients on join/leave | US-001 | ✅ |
| M1-07 | Create `PlayerContext` — store nickname globally in React | US-001 | ✅ |
| M1-08 | Save nickname to `localStorage` on successful join | US-002 | ✅ |
| M1-09 | Pre-fill nickname from `localStorage` on home page load | US-002 | ✅ |
| M1-10 | Handle socket disconnect — remove player from active map | US-003 | ✅ |
| M1-11 | Build Navbar — logo, nav links (Hub, Leaderboard), nickname display | US-018 | ✅ |
| M1-12 | Implement React Router navigation (no page reloads, back button works) | US-019 | ✅ |
| M1-13 | Redirect unauthenticated users from `/hub` to `/` | US-001 | ✅ |
| M1-14 | Apply global dark theme, hover states, and base animations | US-018 | ✅ |

### ✅ Definition of Done
- [x] Player enters nickname → lands on Game Hub
- [x] Invalid nickname shows inline red error (no alerts)
- [x] Duplicate nickname shows specific error message
- [x] Closing tab removes player from lobby (confirmed via server logs)
- [x] Saved nickname pre-fills on revisit
- [x] Browser back/forward navigation works correctly

---

## M2 — Game Hub & Room System
**Goal:** Players can browse games, create/join rooms, and manage game sessions.  
**Stories:** US-004, US-005, US-006, US-007, US-008, US-009  
**Blocks:** M3, M4, M5, M6

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M2-01 | Build Game Hub page with game card grid | US-004 | ✅ |
| M2-02 | Build `GameCard` component (name, desc, type badge, player count, active rooms) | US-004 | ✅ |
| M2-03 | Hover animations on game cards (lift + glow effect) | US-018 | ✅ |
| M2-04 | Game card click → modal: Create Room / Join Room / Quick Play | US-004 | ✅ |
| M2-05 | "Create Room" → emit `room:create` → receive room code | US-005 | ✅ |
| M2-06 | Server: generate 6-char unique room code, create room in memory | US-005 | ✅ |
| M2-07 | Navigate to `/room/:code` after room created | US-005 | ✅ |
| M2-08 | Copy-to-clipboard button for room code | US-005 | ✅ |
| M2-09 | "Join Room" → code input modal → emit `room:join` | US-006 | ✅ |
| M2-10 | Server: validate code, check capacity, check game status — return errors | US-006 | ✅ |
| M2-11 | Build Room page — player list, room code, host controls | US-007 | ✅ |
| M2-12 | Room player list updates in real-time via `room:state` | US-007 | ✅ |
| M2-13 | Show host badge (👑) on host player card | US-007 | ✅ |
| M2-14 | "Start Game" button — host only, disabled if min players not met | US-008 | ✅ |
| M2-15 | Server: validate start, emit `game:start` to all room players | US-008 | ✅ |
| M2-16 | "Leave Room" — emit `room:leave`, return to hub | US-009 | ✅ |
| M2-17 | Server: reassign host on leave, broadcast updated state | US-009 | ✅ |
| M2-18 | Coming-soon game cards shown as disabled with badge | US-004 | ✅ |

### ✅ Definition of Done
- [x] All available games shown as styled cards in hub
- [x] Player can create a room with a copyable 6-char code
- [x] Second player joins via code — both see each other in real-time
- [x] Host badge shown correctly
- [x] Start button disabled until minimum players met
- [x] Invalid code, full room, and in-progress room all show specific errors
- [x] Leaving room works and updates remaining players' view

---

## M3 — Snake Game 🐍
**Goal:** Fully playable solo Snake with live scoring and Supabase submission.  
**Stories:** US-010, US-011  
**Blocks:** M7 (leaderboard needs data)

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M3-01 | Build Snake game canvas component | US-010 | ✅ |
| M3-02 | Grid layout, snake movement loop (requestAnimationFrame) | US-010 | ✅ |
| M3-03 | Arrow key + WASD direction input | US-010 | ✅ |
| M3-04 | Food random spawn (not on snake body) | US-010 | ✅ |
| M3-05 | Collision detection — wall and self | US-010 | ✅ |
| M3-06 | Live score display (food eaten counter) | US-010 | ✅ |
| M3-07 | Speed increases every 5 food items | US-010 | ✅ |
| M3-08 | Game Over screen — final score + restart button | US-010 | ✅ |
| M3-09 | Auto-submit score to `/api/scores` on game over | US-011 | ✅ |
| M3-10 | Show "Score saved! 🎉" confirmation toast | US-011 | ✅ |
| M3-11 | Handle API failure gracefully — show soft error, don't block restart | US-011 | ✅ |
| M3-12 | Snake accessible from hub — single player, no room needed | US-010 | ✅ |

### ✅ Definition of Done
- [x] Snake moves cleanly in all 4 directions
- [x] Food spawns and snake grows correctly
- [x] Game ends on collision — no freeze or crash
- [x] Score appears in Supabase `scores` table after game over
- [x] Restart works without page reload
- [x] Speed increases noticeably over time

---

## M4 — Word Scramble Game 🔤
**Goal:** Real-time multiplayer word unscrambling game working end-to-end.  
**Stories:** US-020, US-021 *(to be written in USER_STORIES.md before starting M4)*  
**Blocks:** M7

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M4-01 | Create word bank JSON (200+ words of varying difficulty) | US-020 | ✅ |
| M4-02 | Server: Word Scramble engine — pick word, shuffle letters, track answers | US-020 | ✅ |
| M4-03 | Server: emit `scramble:round` — scrambled word + time limit (30s) to all players | US-020 | ✅ |
| M4-04 | Client: build Word Scramble UI — scrambled letters display + text input | US-020 | ✅ |
| M4-05 | Client: countdown timer (30 seconds, animated) | US-020 | ✅ |
| M4-06 | Client: emit `scramble:guess` on form submit | US-020 | ✅ |
| M4-07 | Server: validate guess, award points (speed bonus for fast correct answer) | US-020 | ✅ |
| M4-08 | Server: emit `scramble:result` — correct word + scores after time or all guessed | US-020 | ✅ |
| M4-09 | 10 rounds per game; emit `scramble:end` with final scores and winner | US-021 | ✅ |
| M4-10 | Final screen — ranked scores, winner badge, Play Again / Back to Lobby | US-021 | ✅ |
| M4-11 | Submit all player scores to Supabase on game end | US-021 | ✅ |
| M4-12 | Client: Visual 10-step round stepper, "X rounds left" badge, and Final Round alerts | US-020 | ✅ |

### ✅ Definition of Done
- [x] All players in room receive the same scrambled word simultaneously
- [x] Timer expires correctly and result is shown
- [x] Correct guess is validated server-side (case-insensitive)
- [x] Visual 10-step round stepper and remaining rounds counter clearly show game progression and end condition
- [x] 10 rounds complete and final screen shows winner
- [x] Scores saved to Supabase

---

## M5 — Trivia Battle 🧠
**Goal:** Real-time multiplayer trivia quiz working end-to-end.  
**Stories:** US-012, US-013  
**Blocks:** M7

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M5-01 | Create local fallback question bank (`questions.json`, 50+ questions) | US-012 | ✅ |
| M5-02 | Integrate Open Trivia DB API (opentdb.com) | US-012 | ✅ |
| M5-03 | Server: trivia engine — shuffle questions, track round state per room | US-012 | ✅ |
| M5-04 | Server: emit `trivia:question` to all room players simultaneously | US-012 | ✅ |
| M5-05 | Client: Question screen — question text + 4 answer buttons | US-012 | ✅ |
| M5-06 | Client: 15-second animated countdown timer | US-012 | ✅ |
| M5-06b | Client: Visual 10-step question stepper & questions remaining tracker | US-012 | ✅ |
| M5-07 | Client: emit `trivia:answer`, lock buttons after answering | US-012 | ✅ |
| M5-08 | Server: collect answers, calculate points (speed bonus), emit `trivia:result` | US-012 | ✅ |
| M5-09 | Client: per-question result screen — correct answer + current scores | US-012 | ✅ |
| M5-10 | Server: advance to next question after 3s result pause | US-012 | ✅ |
| M5-11 | After Q10, emit `trivia:end` with final scores + winner | US-013 | ✅ |
| M5-12 | Client: final screen — ranked scores, trophy for winner, Play Again / Lobby | US-013 | ✅ |
| M5-13 | Submit all scores to Supabase on game end | US-013 | ✅ |

### ✅ Definition of Done
- [x] All players receive questions at the same time
- [x] Timer expires and locks unanswered players out
- [x] Correct answer highlighted after each round
- [x] Scores update correctly per round
- [x] Visual 10-step question stepper & questions remaining counter indicate progress toward game end
- [x] Game ends after exactly 10 questions
- [x] Winner determined correctly and scores saved to Supabase

---

## M6 — Tic Tac Toe ❌⭕
**Goal:** Turn-based 2-player Tic Tac Toe with rematch support.  
**Stories:** US-014, US-015  
**Blocks:** M7

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M6-01 | Server: TTT engine — board state, turn tracking, move validation | US-014 | 🔲 |
| M6-02 | Server: enforce turn order, reject out-of-turn moves | US-014 | 🔲 |
| M6-03 | Server: detect all 8 win conditions and draw | US-014 | 🔲 |
| M6-04 | Server: emit `ttt:state` with board, current turn, result | US-014 | 🔲 |
| M6-05 | Client: 3x3 grid UI with clickable cells | US-014 | 🔲 |
| M6-06 | Client: emit `ttt:move` on cell click | US-014 | 🔲 |
| M6-07 | Client: show whose turn it is clearly above the board | US-014 | 🔲 |
| M6-08 | Client: disable board on opponent's turn | US-014 | 🔲 |
| M6-09 | Client: highlight winning cells on game end | US-014 | 🔲 |
| M6-10 | End screen — winner/draw + Rematch / Back to Lobby | US-015 | 🔲 |
| M6-11 | Rematch: both confirm → board resets, X/O swap | US-015 | 🔲 |
| M6-12 | Submit win/loss to Supabase scores table | US-014 | 🔲 |

### ✅ Definition of Done
- [ ] Both players see the same board in real-time
- [ ] Only the active player can place a mark
- [ ] All 8 win conditions detected correctly
- [ ] Draw detected on full board with no winner
- [ ] Winning cells highlighted
- [ ] Rematch resets board and swaps X/O
- [ ] Result saved to Supabase

---

## M7 — Leaderboard 🏆
**Goal:** Global score rankings fetched live from Supabase.  
**Stories:** US-016, US-017

### Tasks
| # | Task | Story | Status |
|---|---|---|---|
| M7-01 | Build `GET /api/leaderboard` — top 20 all-time scores | US-016 | 🔲 |
| M7-02 | Build `GET /api/leaderboard/:gameType` — filtered variant | US-016 | 🔲 |
| M7-03 | Leaderboard page UI — table with rank, avatar, nickname, score, game, date | US-016 | 🔲 |
| M7-04 | Filter tabs: All \| Snake \| Word Scramble \| Trivia \| Tic Tac Toe | US-016 | 🔲 |
| M7-05 | Loading skeleton state while fetching | US-016 | 🔲 |
| M7-06 | Empty state: *"No scores yet — be the first!"* | US-016 | 🔲 |
| M7-07 | Highlight current player's rows (distinct bg + "You" badge) | US-017 | 🔲 |
| M7-08 | Auto-refresh leaderboard every 60 seconds | US-016 | 🔲 |

### ✅ Definition of Done
- [ ] Leaderboard loads real data from Supabase (not mocked)
- [ ] All 5 filter tabs work correctly
- [ ] Current player's rows are visually distinct
- [ ] Loading and empty states both render correctly

---

## M8 — Phase 1 QA & Initial Deployment 🚀
**Goal:** All Phase 1 features tested, bugs fixed, app live on a public URL.  
**Blocks:** Phase 2

### Tasks
| # | Task | Status |
|---|---|---|
| M8-01 | Full play-through: Home → Hub → Snake → Score on leaderboard | 🔲 |
| M8-02 | Full play-through: Create Room → Word Scramble (2 players) → Scores saved | 🔲 |
| M8-03 | Full play-through: Create Room → Trivia (2–3 players) → Final screen | 🔲 |
| M8-04 | Full play-through: Tic Tac Toe → Rematch → Back to hub | 🔲 |
| M8-05 | Test disconnect: mid-game disconnect, host disconnect | 🔲 |
| M8-06 | Test edge cases: bad room codes, duplicate nicknames, rapid clicking | 🔲 |
| M8-07 | Test on Chrome, Firefox, and Edge (latest versions) | 🔲 |
| M8-08 | Mobile smoke test (360px min-width) | 🔲 |
| M8-09 | Deploy frontend to Vercel | 🔲 |
| M8-10 | Deploy backend to Render / Railway | 🔲 |
| M8-11 | Set all production environment variables | 🔲 |
| M8-12 | Run full E2E test on the live deployed URL | 🔲 |
| M8-13 | Share URL with team 🎉 | 🔲 |

### ✅ Definition of Done
- [ ] All 4 Phase 1 games playable on live URL without errors
- [ ] Leaderboard shows real data on production
- [ ] No console errors during normal usage
- [ ] Works on Chrome, Firefox, Edge
- [ ] Team has access to the URL

---
---

# 🔵 PHASE 2 — GROWTH
> **Goal:** Expand with 4 more games, social features (chat, profiles), and a richer hub experience.

> ⚠️ Write User Stories (US-020 to US-031) in `USER_STORIES.md` before starting any Phase 2 milestone.

---

## M9 — In-Room Chat 💬
**Goal:** Players can chat with each other inside a game room.  
**Stories:** US-022 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M9-01 | Add chat sidebar/panel to the Room page UI | 🔲 |
| M9-02 | Socket event `chat:message` — client sends, server broadcasts to room | 🔲 |
| M9-03 | Message display: nickname + avatar + message + timestamp | 🔲 |
| M9-04 | Auto-scroll to latest message | 🔲 |
| M9-05 | System messages: "[Player] joined the room", "[Player] left" | 🔲 |
| M9-06 | Enter key submits message, input clears after send | 🔲 |
| M9-07 | Max message length: 200 chars (validated client + server side) | 🔲 |
| M9-08 | Chat is hidden during active gameplay, visible in lobby/waiting screen | 🔲 |

### ✅ Definition of Done
- [ ] Messages appear for all room players in real-time
- [ ] System messages appear on join/leave
- [ ] Chat does not interfere with game controls or layout

---

## M10 — Player Profiles & Game History 👤
**Goal:** Each player has a profile page showing stats and past games.  
**Stories:** US-023, US-024 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M10-01 | Build `GET /api/players/:nickname` API route — returns stats | 🔲 |
| M10-02 | Build `GET /api/players/:nickname/history` — returns last 20 games | 🔲 |
| M10-03 | Build Player Profile page (`/profile/:nickname`) | 🔲 |
| M10-04 | Profile shows: avatar, total games, total wins, best scores per game | 🔲 |
| M10-05 | Game history table — game type, score, won/lost, date | 🔲 |
| M10-06 | Clicking a player's name/avatar anywhere → links to their profile | 🔲 |
| M10-07 | "My Profile" link in Navbar for current player | 🔲 |
| M10-08 | Update Supabase `players` table: increment `total_score` + `games_played` on score submit | 🔲 |

### ✅ Definition of Done
- [ ] Profile page loads correctly for any nickname
- [ ] Stats are accurate (pulled from Supabase)
- [ ] Game history shows last 20 games correctly
- [ ] Profile accessible from navbar and player cards

---

## M11 — UNO Card Game 🃏
**Goal:** Full UNO game (2–6 players) playable in real-time.  
**Stories:** US-025, US-026 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M11-01 | Define UNO card data model (color, type, value) | 🔲 |
| M11-02 | Server: UNO game engine — deck shuffle, deal 7 cards, turn management | 🔲 |
| M11-03 | Server: validate and apply card plays (color match, number match, special cards) | 🔲 |
| M11-04 | Server: implement special cards — Skip, Reverse, Draw 2, Wild, Wild Draw 4 | 🔲 |
| M11-05 | Server: detect win (empty hand), emit `uno:end` | 🔲 |
| M11-06 | Client: player hand UI — display cards, highlight playable ones | 🔲 |
| M11-07 | Client: center pile display (top card) | 🔲 |
| M11-08 | Client: play card on click → emit `uno:play` | 🔲 |
| M11-09 | Client: draw card button → emit `uno:draw` | 🔲 |
| M11-10 | Client: Wild card color picker dialog | 🔲 |
| M11-11 | Client: "UNO!" call button (when 1 card left) | 🔲 |
| M11-12 | Client: show other players' card counts (face down) | 🔲 |
| M11-13 | Final screen — winner + "Play Again" | 🔲 |
| M11-14 | Submit win to Supabase scores | 🔲 |

### ✅ Definition of Done
- [ ] Full UNO game playable 2–6 players
- [ ] All special cards work correctly
- [ ] Turn enforcement works server-side
- [ ] Wild color selection works
- [ ] Win detected and recorded in Supabase

---

## M12 — Flappy Race 🐦
**Goal:** Competitive Flappy Bird where 1–4 players race simultaneously.  
**Stories:** US-027 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M12-01 | Build single-player Flappy Bird canvas game (tap/spacebar to flap) | 🔲 |
| M12-02 | Pipe generation, gap size, scroll speed | 🔲 |
| M12-03 | Collision detection — pipes and ground | 🔲 |
| M12-04 | Score = pipes passed | 🔲 |
| M12-05 | Multiplayer: each player controls their own bird, see ghost outlines of others | 🔲 |
| M12-06 | Server: sync all bird positions via `flappy:state` at ~30fps | 🔲 |
| M12-07 | Server: detect each player's crash, track last-bird-standing | 🔲 |
| M12-08 | Winner = player who survives longest (or highest score if all crash) | 🔲 |
| M12-09 | Final screen — rankings + scores + Play Again | 🔲 |
| M12-10 | Submit scores to Supabase | 🔲 |

### ✅ Definition of Done
- [ ] Single-player Flappy works correctly
- [ ] 2+ players can race simultaneously
- [ ] Other players' birds visible as outlines
- [ ] Winner determined correctly
- [ ] Scores submitted to Supabase

---

## M13 — Chess ♟️
**Goal:** Full 2-player Chess game with move validation.  
**Stories:** US-028, US-029 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M13-01 | Integrate a Chess logic library (e.g., `chess.js`) for move validation | 🔲 |
| M13-02 | Server: Chess game engine — board state, turn tracking, using chess.js | 🔲 |
| M13-03 | Server: validate moves via chess.js, emit updated board state | 🔲 |
| M13-04 | Server: detect check, checkmate, stalemate, draw | 🔲 |
| M13-05 | Client: render chess board (8x8 grid, alternating squares) | 🔲 |
| M13-06 | Client: render pieces (Unicode chess symbols or SVG icons) | 🔲 |
| M13-07 | Client: click piece → highlight valid moves → click destination to move | 🔲 |
| M13-08 | Client: emit `chess:move` with origin + destination | 🔲 |
| M13-09 | Client: highlight king when in check | 🔲 |
| M13-10 | End screen — checkmate/draw/stalemate message + Play Again | 🔲 |
| M13-11 | Offer draw button + accept/decline flow | 🔲 |
| M13-12 | Submit win/draw to Supabase | 🔲 |

### ✅ Definition of Done
- [ ] All piece movements validated correctly (no illegal moves possible)
- [ ] Check and checkmate detected and shown
- [ ] Both players see the board update in real-time
- [ ] Draw offer works
- [ ] Result saved to Supabase

---

## M14 — Emoji Guessing Game 🤔
**Goal:** Party game where one player sends emoji clues and others guess the answer.  
**Stories:** US-030, US-031 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M14-01 | Create answer bank JSON — 100+ phrases/movies/words with emoji hints | 🔲 |
| M14-02 | Server: game engine — assign clue-giver per round, send answer only to them | 🔲 |
| M14-03 | Client (clue-giver): emoji picker UI to compose the clue | 🔲 |
| M14-04 | Client (clue-giver): submit emoji clue → broadcast to all guessers | 🔲 |
| M14-05 | Client (guessers): display emoji clue + text input for guess | 🔲 |
| M14-06 | Server: validate guesses (case-insensitive, partial match option) | 🔲 |
| M14-07 | First correct guesser + clue-giver both earn points | 🔲 |
| M14-08 | Round timer (60 seconds) — if no correct guess, reveal answer | 🔲 |
| M14-09 | 5 rounds per game, rotate clue-giver each round | 🔲 |
| M14-10 | Final screen — winner + scores + Play Again | 🔲 |
| M14-11 | Submit scores to Supabase | 🔲 |

### ✅ Definition of Done
- [ ] Clue-giver sees their answer, guessers do not
- [ ] Emoji clue broadcasts to all guessers instantly
- [ ] Correct guess awarded points, clue-giver also gets points
- [ ] 5 rounds complete with rotating clue-givers
- [ ] Scores saved to Supabase

---

## M15 — Phase 2 QA & Deploy Update 🚀
**Goal:** All Phase 2 features tested and live.

### Tasks
| # | Task | Status |
|---|---|---|
| M15-01 | Full play-through all 4 new games (Word Scramble, UNO, Flappy Race, Chess, Emoji) | 🔲 |
| M15-02 | Test player profiles + game history accuracy | 🔲 |
| M15-03 | Test in-room chat across all game types | 🔲 |
| M15-04 | Regression test all Phase 1 games still work | 🔲 |
| M15-05 | Test with 4+ players simultaneously | 🔲 |
| M15-06 | Push updated build to Vercel + Render/Railway | 🔲 |
| M15-07 | Verify live URL with full Phase 2 features | 🔲 |

### ✅ Definition of Done
- [ ] All 8 games playable on live URL
- [ ] Chat and profiles working in production
- [ ] No regressions in Phase 1 features

---
---

# 🟢 PHASE 3 — ADVANCED & POLISH
> **Goal:** Complex games, full mobile support, sound, PWA — the complete final product.

> ⚠️ Write User Stories (US-032 to US-038) in `USER_STORIES.md` before starting Phase 3.

---

## M16 — Skribbl-Style Drawing & Guessing Game 🎨
**Goal:** One player draws, others guess — real-time collaborative canvas game.  
**Stories:** US-032, US-033 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M16-01 | Client: shared drawing canvas using HTML5 Canvas API | 🔲 |
| M16-02 | Client (drawer): brush tool, color picker, eraser, clear button | 🔲 |
| M16-03 | Client: broadcast canvas strokes via `draw:stroke` socket events | 🔲 |
| M16-04 | Client (guessers): real-time rendering of received strokes | 🔲 |
| M16-05 | Server: assign drawer per round, send word only to drawer | 🔲 |
| M16-06 | Client (guessers): text input for guesses + live chat display | 🔲 |
| M16-07 | Server: validate guesses, award points (faster = more points) | 🔲 |
| M16-08 | Display word as blanks `_ _ _ _` to guessers, reveal on correct guess | 🔲 |
| M16-09 | 80-second round timer | 🔲 |
| M16-10 | Rotate drawer each round, 5 rounds per game | 🔲 |
| M16-11 | Final screen — winner + scores + Play Again | 🔲 |
| M16-12 | Submit scores to Supabase | 🔲 |

### ✅ Definition of Done
- [ ] Drawing strokes render in real-time for all players
- [ ] Only the drawer sees the word
- [ ] Correct guesses award points and reveal the word
- [ ] 5 rounds with rotating drawers complete correctly
- [ ] Canvas clears cleanly between rounds

---

## M17 — Ludo Board Game 🎲
**Goal:** Classic Ludo for 2–4 players with full rules.  
**Stories:** US-034, US-035 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M17-01 | Design Ludo board layout (SVG or Canvas) | 🔲 |
| M17-02 | Server: Ludo engine — token positions, turn order, dice rolls | 🔲 |
| M17-03 | Server: dice roll generates 1–6, emit to all players | 🔲 |
| M17-04 | Server: validate and apply token moves (safe squares, home column) | 🔲 |
| M17-05 | Server: handle captures — send opponent token back to start | 🔲 |
| M17-06 | Server: detect win (all 4 tokens home) | 🔲 |
| M17-07 | Client: render board, colored tokens, home base areas | 🔲 |
| M17-08 | Client: animate token movement along board path | 🔲 |
| M17-09 | Client: roll dice button → emit `ludo:roll` | 🔲 |
| M17-10 | Client: highlight moveable tokens after dice roll | 🔲 |
| M17-11 | Final screen — winner + Play Again | 🔲 |
| M17-12 | Submit win to Supabase | 🔲 |

### ✅ Definition of Done
- [ ] All 4 player colors render on board correctly
- [ ] Dice rolls are server-generated (not client)
- [ ] Token captures work correctly
- [ ] Win detected when all 4 tokens reach home
- [ ] Animated token movement visible to all players

---

## M18 — Sound Effects & Music 🔊
**Goal:** Ambient music and game sound effects to enhance immersion.  
**Stories:** US-036 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M18-01 | Source/create sound effects: button click, game start, correct answer, wrong answer, game over, win | 🔲 |
| M18-02 | Source/create background music tracks (1 for hub, 1 for gameplay) | 🔲 |
| M18-03 | Implement audio manager utility (play, pause, volume, mute) | 🔲 |
| M18-04 | Add Music ON/OFF toggle in Navbar (persisted in localStorage) | 🔲 |
| M18-05 | Add SFX ON/OFF toggle in Navbar (persisted in localStorage) | 🔲 |
| M18-06 | Wire SFX to all key game events across all games | 🔲 |
| M18-07 | Music fades in on hub, changes track on game start | 🔲 |
| M18-08 | Ensure sounds don't play until user interacts (browser autoplay policy) | 🔲 |

### ✅ Definition of Done
- [ ] SFX play on key game events across all games
- [ ] Background music plays in hub and gameplay areas
- [ ] Music and SFX toggles work and persist across sessions
- [ ] No autoplay policy violations (no sounds before first user click)

---

## M19 — Mobile Responsiveness & PWA 📱
**Goal:** App works beautifully on mobile and can be installed as a PWA.  
**Stories:** US-037, US-038 *(write before starting)*

### Tasks
| # | Task | Status |
|---|---|---|
| M19-01 | Audit all pages for mobile layout issues (360px min-width) | 🔲 |
| M19-02 | Fix Navbar for mobile — hamburger menu or bottom nav bar | 🔲 |
| M19-03 | Make Game Hub card grid responsive (1 col on mobile, 2 on tablet, 3 on desktop) | 🔲 |
| M19-04 | Make Room page stack vertically on mobile | 🔲 |
| M19-05 | Make Snake controls work on mobile (on-screen D-pad or swipe gestures) | 🔲 |
| M19-06 | Test and fix all games on mobile touchscreen | 🔲 |
| M19-07 | Add `manifest.json` for PWA (app name, icons, theme color, display: standalone) | 🔲 |
| M19-08 | Add Service Worker for offline page (show "You're offline" page) | 🔲 |
| M19-09 | Test PWA install on Android Chrome + iOS Safari | 🔲 |
| M19-10 | Lighthouse PWA audit — score ≥ 80 | 🔲 |

### ✅ Definition of Done
- [ ] All pages usable at 360px width
- [ ] Snake playable on mobile with touch controls
- [ ] PWA installs on Android and iOS
- [ ] "You're offline" page shown when no connection
- [ ] Lighthouse PWA score ≥ 80

---

## M20 — Final QA & Production Polish ✨
**Goal:** The app is complete, polished, stable, and production-ready.

### Tasks
| # | Task | Status |
|---|---|---|
| M20-01 | Full E2E play-through of all 10 games | 🔲 |
| M20-02 | Stress test: 10+ players in hub simultaneously | 🔲 |
| M20-03 | Audit all error states — every failure has a friendly message | 🔲 |
| M20-04 | Audit all loading states — no blank/unresponsive moments | 🔲 |
| M20-05 | Performance check — page load < 2s, no memory leaks | 🔲 |
| M20-06 | Cross-browser final test: Chrome, Firefox, Edge | 🔲 |
| M20-07 | Full mobile test on real device (Android + iOS) | 🔲 |
| M20-08 | Final Supabase review — no orphan records, queries optimized | 🔲 |
| M20-09 | Write final `README.md` — setup guide, feature list, screenshots | 🔲 |
| M20-10 | Tag `v1.0.0` release in git | 🔲 |
| M20-11 | Deploy final build to Vercel + Render/Railway | 🔲 |
| M20-12 | Celebrate with the team 🎉🎮 | 🔲 |

### ✅ Definition of Done
- [ ] All 10 games work on production URL
- [ ] App installable as PWA
- [ ] No console errors on any page
- [ ] README complete with setup instructions
- [ ] `v1.0.0` git tag created

---

## 📈 Full Coverage Matrix

| User Story | Title | Milestone | Phase | Covered |
|---|---|---|---|---|
| US-001 | Enter a Nickname | M1 | 1 | 🔲 |
| US-002 | Rejoin with Saved Nickname | M1 | 1 | 🔲 |
| US-003 | Leave the Hub | M1 | 1 | 🔲 |
| US-004 | Browse Available Games | M2 | 1 | 🔲 |
| US-005 | Create a Game Room | M2 | 1 | 🔲 |
| US-006 | Join a Room by Code | M2 | 1 | 🔲 |
| US-007 | See Who's in My Room | M2 | 1 | 🔲 |
| US-008 | Start a Game (Host) | M2 | 1 | 🔲 |
| US-009 | Leave a Room | M2 | 1 | 🔲 |
| US-010 | Play Snake | M3 | 1 | 🔲 |
| US-011 | Submit Snake Score | M3 | 1 | 🔲 |
| US-012 | Play a Trivia Round | M5 | 1 | 🔲 |
| US-013 | See Trivia Results | M5 | 1 | 🔲 |
| US-014 | Play Tic Tac Toe | M6 | 1 | 🔲 |
| US-015 | Rematch in Tic Tac Toe | M6 | 1 | 🔲 |
| US-016 | View the Leaderboard | M7 | 1 | 🔲 |
| US-017 | See My Own Scores Highlighted | M7 | 1 | 🔲 |
| US-018 | Experience a Polished Dark UI | M0+M1 | 1 | 🔲 |
| US-019 | Navigate Without Page Reloads | M1 | 1 | 🔲 |
| US-020 | Play Word Scramble | M4 | 1 | 🔲 |
| US-021 | Word Scramble Results & Scores | M4 | 1 | 🔲 |
| US-022 | In-Room Chat | M9 | 2 | 🔲 |
| US-023 | View Player Profile | M10 | 2 | 🔲 |
| US-024 | View Game History | M10 | 2 | 🔲 |
| US-025 | Play UNO | M11 | 2 | 🔲 |
| US-026 | UNO Special Cards & Win | M11 | 2 | 🔲 |
| US-027 | Play Flappy Race | M12 | 2 | 🔲 |
| US-028 | Play Chess | M13 | 2 | 🔲 |
| US-029 | Chess — Check, Checkmate, Draw | M13 | 2 | 🔲 |
| US-030 | Play Emoji Guessing | M14 | 2 | 🔲 |
| US-031 | Emoji Guessing — Scoring & Win | M14 | 2 | 🔲 |
| US-032 | Play Drawing & Guessing Game | M16 | 3 | 🔲 |
| US-033 | Drawing Game — Scoring & Win | M16 | 3 | 🔲 |
| US-034 | Play Ludo | M17 | 3 | 🔲 |
| US-035 | Ludo — Captures & Win | M17 | 3 | 🔲 |
| US-036 | Sound Effects & Music | M18 | 3 | 🔲 |
| US-037 | Mobile Responsive Layout | M19 | 3 | 🔲 |
| US-038 | Install as PWA | M19 | 3 | 🔲 |

**Total: 38 User Stories | 20 Milestones | 3 Phases | 10 Games | 100% Coverage ✅**

---

## 🚨 Change Control

If anything needs to change:

1. Update this file first — describe what changed and why in the table below
2. Update `PRD.md` if a requirement changed
3. Update `USER_STORIES.md` if a story changed or was added
4. Note the change in the Decision Log in `PROJECT.md`
5. **Never** build something not in this plan

### Change Log
| Date | Milestone | Change | Reason |
|---|---|---|---|
| 2026-10-06 | All | v2.0 — Expanded from 8 to 20 milestones to cover all 3 phases | Phase 2 & 3 were missing from v1.0 |
| 2026-10-06 | M4 | Added Word Scramble as its own milestone | Was in Phase 1 game catalog but missing from milestones |

---

> **20 milestones. 3 phases. 10 games. 38 user stories. One end goal.**  
> **Lock it. Trust it. Build it. 🎮**
