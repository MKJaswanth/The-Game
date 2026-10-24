# 📡 STATUS.md — The Game

> This file is updated after **every working session**.  
> It is the first file to read before starting any work.

---

## 🟡 Current State

**Phase:** Phase 2 — Growth  
**Active Milestone:** M14 Complete — Emoji Guessing  
**Last Updated:** 2026-10-24  
**Overall Progress:** Milestones 0–14 Complete (15 / 20 Milestones — 75%)  
**Live LAN Hosting:**  
- 📱 Frontend: `http://192.168.0.110:5173/` (Playable on any phone/device on Wi-Fi)  
- ⚙️ Backend: `http://192.168.0.110:4000/` (Socket.IO + REST on 0.0.0.0)

---

## 🔄 What's In Progress

**M11 Complete — UNO (US-025, US-026).**
- Server `socket/games/uno.js`: 108-card deck, 7-card deal, color/number/wild matching, Skip / Reverse / Draw 2 / Wild / Wild +4, forced draw stacks with reshuffle-from-discard, 5-second UNO! call window with **Catch!** +2 penalty, win detection, standings by card points, Supabase scoring, forfeit on leave, rematch voting
- Client `games/uno/Uno.jsx` + `uno.css`: private hand with playable highlighting, center pile with active color, face-down opponent stacks, draw pile with pending-draw warning, wild color picker, UNO!/Catch! buttons, winner podium with Play Again
- Verified with a 15-assertion two-player Socket.IO smoke test (`test-uno.mjs`) plus a live browser match alongside a scripted bot (`uno-bot.mjs`)
- Fixed two real defects found during verification: callback payloads were returning the raw game object (its Node timer handle is circular → socket.io parser stack overflow), and playable-card lists were advertised while a draw stack was pending
- **Turn rules (2026-10-23):** every turn now has a server-authoritative 25 s clock (`turnEndsAt`, tunable with `UNO_TURN_MS`) that draws a card and passes the turn if nobody acts; drawing follows the real rule (a playable draw keeps your turn and locks the hand to that card, otherwise the turn passes); an explicit `uno:pass` lets a player decline a drawn card; the table gets a feed line for every play/skip/UNO call/penalty and an `atUno` badge. Verified by `test-uno.mjs` (28 checks incl. the UNO call window and badge) and the new `test-uno-turns.mjs` (23–43 checks: clock timeout, draw-then-play, hand lock, pass, out-of-turn pass rejection)

**M12 Complete — Flappy Race (US-027).**
- Server `socket/games/flappy.js`: authoritative 30 Hz flight loop (gravity, flap impulse, ceiling, ground), shared pipe course with spacing/gap tuning and a scroll-speed ramp, per-bird pipe scoring, crash detection with spectator mode, last-bird-standing winner resolution (pipes → survival time tie-breaks), 4-player cap, solo auto-start, rematch voting, leave/disconnect cleanup, and Supabase score persistence
- Client `games/flappy/Flappy.jsx` + `flappy.css`: canvas renderer with parallax starfield, neon pipe course, own bird + labelled rival ghosts, interpolated 30 Hz snapshots, DOM race HUD with live pipe counts, countdown overlay, crash-spectating banner, keyboard/pointer flaps, ranked results screen
- Wiring: capacity `1–4` in `rooms.js`, handlers registered in `socket/index.js`, hub card enabled, Room route + rules banner, leaderboard tabs for UNO & Flappy, profile game labels, card meta
- Verified with a 21-assertion two-player Socket.IO race (`test-flappy.mjs`) — including out-of-race flap rejection, crash lockout, scoring, broadcast rate, standings order and leaderboard persistence — plus a live browser race against an autopilot peer that rendered frames, accepted keyboard flaps and reached the results screen

**M13 Complete — Chess (US-028, US-029).**
- Server `socket/games/chess.js`: `chess.js` owns the rules; the engine owns seats, turn order, check resolution and results. Every move is re-validated server-side, snapshots ship FEN + the legal-move map for the side to move, and checkmate/stalemate/threefold/insufficient-material/fifty-move are all detected
- Client `games/chess/Chess.jsx` + `chess.css`: wood-board grid with Unicode pieces, colour-aware orientation, legal-move dots and capture rings, check pulse, captured trays, SAN move list, promotion picker, draw offer + accept/decline, resign confirmation, result panel with colour-swapping rematch
- Wiring: capacity `2–2`, handlers in `socket/index.js`, hub card enabled, Room route + rules banner, leaderboard tab, profile label, card meta
- Verified with a 44-assertion two-player Socket.IO suite (`test-chess.mjs`) — illegal and out-of-turn rejection, Scholar's mate, under-promotion, castling, draw offer/decline/accept, resign, colours alternating across rematches, leaderboard persistence — plus a browser match against `chess-bot.mjs` that ended in a real checkmate through the UI

**M14 Complete — Emoji Guessing (US-030, US-031).**
- Data `data/emojiAnswers.json`: 114 authored answers across movies, food, animals, nature, places, objects, phrases and everyday things, each with a ready-made emoji hint and category
- Server `socket/games/emoji.js`: 5 rounds with rotating clue-giver, secret answers delivered only to the clue-giver's socket, 30 s compose phase with authored-hint fallback, 60 s guess phase, normalized matching (case/punctuation/articles/plurals), speed-scaled 60–100 points plus 40 for the clue-giver, reveal intermissions, leave handling, rematch voting, Supabase persistence
- Client `games/emoji/Emoji.jsx` + `emoji.css`: emoji composer with 8 palette categories, live preview, undo/clear, timer bar, animated "writing a clue" state with answer blanks, guess input with a live public guess feed, reveal card, ranked final screen and a sticky score rail
- Verified with a 55-assertion five-round Socket.IO suite (`test-emoji.mjs`) — answer privacy, clue authorization, self-guess rejection, scoring totals, rotation, persistence, rematch — plus browser play against `emoji-bot.mjs` covering the composer, clue broadcast, guess scoring and reveals

**M15 In Progress — Phase 2 live QA.**
- UNO turn clock, draw-then-play rule, pass action and table feed are live on Render (`3f53413`); the deployed bundle serves the countdown bar, drawn-card banner and UNO badge
- Fixed a production-only crash that blanked every Trivia room: `Trivia.jsx` called `useCallback` without importing it, so React threw `ReferenceError: useCallback is not defined` while rendering and the whole room route unmounted. Trivia has been openable-but-blank on the deployed site since M5; it now renders, answers and scores in the browser
- New `test-quiz-games.mjs` plays both quiz games to completion over Socket.IO against any `SERVER_URL`: Trivia solo + 2-player (10 questions, speed scoring, duplicate-answer rejection, rankings) and Word Scramble solo (10 rounds, wrong/right guesses, `scramble:get_state`, final score). All green against localhost and against the live Render URL
- Browser pass over the deployed origin: hub, Trivia solo (question, options, scoreboard, advancing rounds), Word Scramble solo (scrambled letters, solved +320 pts, reveal), Tic Tac Toe vs CyberBot, Chess lobby
- **Quiz wins were recorded as losses (2026-10-24):** Trivia and Word Scramble called `recordScore` without a `won` flag, so the match winner was stored as a defeat. The top score (ties included) is now marked as a win; `test-quiz-games.mjs` asserts the result reaches the profile store with `totalWins >= 1`, and the whole suite (113 assertions) passes against the deployed origin
- **Flappy "Race Again" bounced to the hub (2026-10-24):** restarting a race tore down the previous one with a `flappy:closed` broadcast, which the client reads as "the room is gone". The restart now clears the old tick silently and `test-flappy.mjs` asserts a rematch restarts without a close event
- `test-flappy.mjs` no longer blames the server for a long-haul link: the tick-rate sample moved into the countdown (a bird-independent window) and the reflex-dependent survival checks report `SKIP` with the measured round trip above a local-link threshold
- Full live regression on the deployed origin: every suite green via `SERVER_URL` (chess 44, emoji 81, quiz games 113, uno + uno-turns 25, flappy 21) and every game opened in the deployed browser — Snake (steered, survived), Trivia solo (answer + reveal + scoreboard), Word Scramble solo (solved ROCKET +310), Tic Tac Toe vs CyberBot (full match to defeat screen), Chess vs `chess-bot.mjs` (e4 e5 through the move list), Emoji vs `emoji-bot.mjs` (composer → clue broadcast → guess feed), UNO turn clock with a bot seat, Flappy (course canvas, flap button, ranked results, rematch)
- **Join screen could hang on "Entering…" forever (2026-10-24):** `joinHub`'s five-second fallback read `isJoining` from the render closure that created it (always `false`), so a join the server never acknowledged left the button disabled with no error and no way back. The ack and the timeout now race on a local `settled` flag. Verified by pointing the dev client at a stopped backend: before the fix the button stayed on "Entering…" indefinitely, after it the form returns with "Connection timed out. Please try again." in ~5 s, and the normal path still lands on `/hub`
- **Three suites failed on the deployed origin for local-only reasons (2026-10-24):** the solo Flappy check subscribed to `flappy:end` after the crash had already fired it (now subscribes before the countdown), the UNO turn-clock check waited 9 s against a 25 s production turn (now budgets from the broadcast `turnMs`), and the reconnect check expected a shortened seat grace window (now reports `SKIP` off localhost, where `RECONNECT_GRACE_MS` is not ours to set). `test-reconnect`, `test-uno-turns` and `test-flappy` are green against the deployed origin, with only those two documented `SKIP`s
- Live browser re-verification this session: Snake (start → ate an orb → game over → `10 pts` reached `/api/players/…`), Emoji Guessing (created a 2-player room with `emoji-bot.mjs`, composer, guessed "Basketball" for +85 with the clue-giver's +40, reveal phase)

**Next Up:** M15 — Phase 2 QA & Deploy Update (US-022–031 regression pass)

> Suite baseline: `test-chess`, `test-emoji`, `test-quiz-games`, `test-reconnect`, `test-uno`, `test-uno-turns`, `test-flappy` are all green against `localhost:4000` (grace/turn windows shortened) **and** against the deployed origin via `SERVER_URL`.

---

## ✅ What Was Completed Last Session

| Item | Notes |
|---|---|
| `PROJECT.md` created | Architecture, tech stack, folder structure, DB schema |
| `PRD.md` created | Full requirements with priorities (Must Have / Should Have) |
| `USER_STORIES.md` created | 21 Phase 1 stories with acceptance criteria including US-020 & US-021 |
| `MILESTONES.md` created | 20 milestones, 3 phases, 100% story coverage |
| `TASKS.md` created | Full task list with Todo / Doing / Done tracking |
| `STATUS.md` created | Status tracking log |
| `M0-01` to `M0-10` | Project scaffold, Vite React, Express, Socket.IO, design system, and verification |
| **Milestone M0** | **Project Scaffold & Design System fully completed & verified** |
| `M1-01` to `M1-14` | Home page, nickname validation, socket join/leave, PlayerContext, duplicate rejection, live lobby presence, auth routing |
| **Milestone M1** | **Core Session & Navigation fully completed & verified** |
| `M2-01` to `M2-18` | Game Hub card grid, GameCard component, filters, room creation/joining modal, 6-char code generation, Room page with copy button, host controls, real-time presence |
| **Milestone M2** | **Game Hub & Room System fully completed & verified** |
| `M3-01` to `M3-12` | Snake canvas component, food spawn, collision, speed increase, score submission to `/api/scores`, toasts |
| **Milestone M3** | **Snake Game fully completed & verified** |
| `M4-01` to `M4-11` | 266-word dictionary, server engine with letter scrambler, 30s timers, speed bonus scoring, 3D letter tiles UI, live scoreboard, Play Again restart |
| `M4-12` | Visual 10-step round stepper (`[✓]...[10]`), "(X rounds left)" badge, final round alerts, and dynamic room match format banner |
| **Milestone M4** | **Word Scramble Game fully completed & verified** |
| `M5-01` to `M5-13` | Full Trivia Battle: OpenTDB live API + 60-question fallback, 15s timers, 4 options A/B/C/D with keyboard shortcuts, speed bonus scoring, 10-step question stepper, remaining questions tracker, final question alert, per-question reveals, champion podium, score persistence |
| **Milestone M5** | **Trivia Battle Game fully completed & verified** |
| `M6-01` to `M6-12` | Complete Tic Tac Toe: Server engine (turn alternation, move validation, 8 win combo detection, draw detection, CyberBot AI heuristics), Client 3x3 grid, turn auras, ghost previews, gold win line highlight, game over screen, instant rematch with X/O swap, score saving to Supabase |
| **Milestone M6** | **Tic Tac Toe Game fully completed & verified** |
| `M7-01` to `M7-09` | Global Leaderboard: REST API (`/api/leaderboard` & `/:gameType`), ranking table (🥇🥈🥉 medals), filter tabs, shimmering skeleton loaders, empty state CTA, current player highlight ("YOU" badge), auto-refresh every 60s |
| **Milestone M7** | **Leaderboard fully completed & verified** |
| `M8-01` to `M8-13` | Phase 1 QA pass, deploy configs (Vercel SPA + Render), env variable runbook |
| **Milestone M8** | **Phase 1 QA & Initial Deploy fully completed & verified** |
| `M9-01` to `M9-08` | In-room chat: `chat:message` broadcast, history fetch, system join/leave messages, `ChatPanel` with auto-scroll and 200-char limits, two-column lobby |
| **Milestone M9** | **In-Room Chat fully completed & verified** |
| `M10-01` to `M10-08` | Player profiles: `/api/players/:nickname`, history endpoint, profile page, navbar/player-card links, score + games-played counters |
| **Milestone M10** | **Player Profiles & Game History fully completed & verified** |
| `M12-01` to `M12-10` | Flappy Race: authoritative 30 Hz flight loop, shared pipe course, ghost rivals, race HUD, crash spectating, ranked results, Supabase persistence, leaderboard + profile wiring |
| **Milestone M12** | **Flappy Race fully completed & verified** |
| `M13-01` to `M13-12` | Chess: server-validated `chess.js` engine, FEN snapshots with legal-move maps, check/mate/draw detection, draw offers, resign + forfeit, colour-swapping rematch, board UI with promotion picker, leaderboard/profile wiring |
| **Milestone M13** | **Chess fully completed & verified** |
| `M14-01` to `M14-11` | Emoji Guessing: 114-answer bank, rotating clue-giver, private answers, emoji composer, 30s/60s phase timers, normalized guess matching, speed scoring, five rounds, final standings, rematch, persistence |
| **Milestone M14** | **Emoji Guessing fully completed & verified** |

---

## 🐛 Known Issues

| Issue | Impact | Notes |
|---|---|---|
| ~~Reloading the page mid-game drops socket.io room membership~~ | **Fixed (M15):** a refresh, a dropped Wi-Fi link or a sleeping laptop now keeps the seat. The server parks a live seat for 45 s and the tab reclaims it with the resume token it stored in `sessionStorage`; nickname-only takeover is allowed for a seat the server already sees as disconnected, so a stranger can never evict a connected player. The room also shows a “loss connection — holding the seat” banner while somebody is away. | Covered by `test-reconnect.mjs` (19 checks: token issue, no token leakage in broadcasts, resume, hijack rejection, grace expiry) and by a browser refresh during a live chess game. |
| ~~Trivia room renders blank on the deployed site~~ | **Fixed (M15):** `Trivia.jsx` used `useCallback` without importing it, so the room route crashed with `ReferenceError: useCallback is not defined` and rendered nothing but the footer. Import added; the room now renders, scores and advances. | Caught by driving the live URL in a browser and reading the console; covered from then on by `test-quiz-games.mjs` and this browser check. |
| Flappy broadcast measured at ~26/s instead of 30/s | Slightly less smooth motion on slow machines | `setInterval` drift on Windows; client already interpolates between snapshots |
| Chess has no move clock | A player who walks away leaves the game open indefinitely | Groundwork exists (`startedAt`, `moveCount`); add a per-move timeout in M15 |
| Emoji round rests on the honour system for clue quality | A clue-giver can send irrelevant emoji and stall the round | Guessers can still solve by luck; a "skip/re-roll" vote is the natural M15+ fix |
| Flappy is latency-bound on a distant deploy | The flap cycle (420 px/s impulse against 1450 px/s² gravity) has a ~0.29 s control horizon, so the game is hard when the round trip is ~0.25 s | Render's free instance sits far from the players (measured 244 ms RTT from India); the fix is a nearby region plus client-side prediction of the bird |

---

## ⚠️ Open Decisions (Must Resolve Before Building)

| # | Question | Blocking |
|---|---|---|
| Q1 | Snake solo score attack mode chosen for MVP | Resolved (M3 Complete) |
| Q2 | Public URL (deploy now) or LAN-only first? | Resolved: LAN Hosting active at `http://192.168.0.110:5173` |
| Q3 | Who owns the Supabase project and credentials? | M0 (schema created, pending live DB credentials) |
| Q4 | Should trivia categories be selectable by the room host? | M5 (Default: Random / General Knowledge with host choice if time permits) |
| Q5 | M10 Player Profiles — verify API endpoints work and profile page renders correctly | Resolved — all endpoints implemented and linked from Navbar/Leaderboard/Room |
---

## 👟 Exact Next Step

**Milestone 15 — Phase 2 QA & Deploy Update:**
1. Full play-through of all eight games (Word Scramble, UNO, Flappy, Chess, Emoji + the four Phase 1 games) on the LAN build.
2. Fix the reload-drop defect: give sockets a reconnect grace window so a refresh does not eject a player from an in-game room (`room:get` should re-join the socket room and re-seat the nickname).
3. Add a move clock or inactivity timeout to Chess so a stalling player cannot hold a room open.
4. Re-run `test-uno.mjs`, `test-flappy.mjs`, `test-chess.mjs`, `test-emoji.mjs`, then push the build to Vercel + Render and verify the live URL.

---

## 📋 Milestone Completion Log

| Milestone | Name | Status | Completed |
|---|---|---|---|
| M0 | Project Scaffold & Design System | ✅ Completed | 2026-10-06 |
| M1 | Core Session & Navigation | ✅ Completed | 2026-10-06 |
| M2 | Game Hub & Room System | ✅ Completed | 2026-10-06 |
| M3 | Snake Game | ✅ Completed | 2026-10-06 |
| M4 | Word Scramble | ✅ Completed | 2026-10-06 |
| M5 | Trivia Battle | ✅ Completed | 2026-10-07 |
| M6 | Tic Tac Toe | ✅ Completed | 2026-10-08 |
| M7 | Leaderboard | ✅ Completed | 2026-10-09 |
| M8 | Phase 1 QA & Deploy | ✅ Completed | 2026-10-09 |
| M9 | In-Room Chat | ✅ Completed | 2026-10-12 |
| M10 | Player Profiles & History | ✅ Completed | 2026-10-16 |
| M11 | UNO | ✅ Completed | 2026-10-21 |
| M12 | Flappy Race | ✅ Completed | 2026-10-21 |
| M13 | Chess | ✅ Completed | 2026-10-21 |
| M14 | Emoji Guessing | ✅ Completed | 2026-10-21 |
| M15 | Phase 2 QA & Deploy | 🔲 Not Started | — |
| M16 | Drawing & Guessing Game | 🔲 Not Started | — |
| M17 | Ludo | 🔲 Not Started | — |
| M18 | Sound Effects & Music | 🔲 Not Started | — |
| M19 | Mobile & PWA | 🔲 Not Started | — |
| M20 | Final QA & Production Polish | 🔲 Not Started | — |

---

## 🤖 Standard AI Prompt (Copy & Use Every Session)

```
Read PROJECT.md, TASKS.md, and STATUS.md.
Work on product creation only. Follow the existing patterns.
The current task is listed under "Doing" in TASKS.md.
Verify the result, explain what changed and any remaining issues,
and update STATUS.md and TASKS.md with the next step.
```
