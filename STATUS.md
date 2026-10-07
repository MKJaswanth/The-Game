# 📡 STATUS.md — The Game

> This file is updated after **every working session**.  
> It is the first file to read before starting any work.

---

## 🟡 Current State

**Phase:** Phase 1 — MVP  
**Active Milestone:** M6 — Tic Tac Toe ❌⭕  
**Last Updated:** 2026-10-07  
**Overall Progress:** Milestones 0, 1, 2, 3, 4, 5 Complete (6 / 20 Milestones — 30%)  
**Live LAN Hosting:**  
- 📱 Frontend: `http://192.168.0.110:5173/` (Playable on any phone/device on Wi-Fi)  
- ⚙️ Backend: `http://192.168.0.110:4000/` (Socket.IO + REST on 0.0.0.0)

---

## 🔄 What's In Progress

**Task:** `M6-01` — Server TTT engine (board, turn alternation, move validation)  
**Status:** In progress (Active Milestone: M6)

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

---

## 🐛 Known Issues

*None — Milestones 0, 1, 2, 3, & 4 completed with zero errors.*

---

## ⚠️ Open Decisions (Must Resolve Before Building)

| # | Question | Blocking |
|---|---|---|
| Q1 | Snake solo score attack mode chosen for MVP | Resolved (M3 Complete) |
| Q2 | Public URL (deploy now) or LAN-only first? | Resolved: LAN Hosting active at `http://192.168.0.110:5173` |
| Q3 | Who owns the Supabase project and credentials? | M0 (schema created, pending live DB credentials) |
| Q4 | Should trivia categories be selectable by the room host? | M5 (Default: Random / General Knowledge with host choice if time permits) |

---

## 👟 Exact Next Step

**Milestone 6 — Tic Tac Toe:**
1. **M6-01 to M6-04** → Server TTT engine (`server/src/socket/games/tictactoe.js`) with 3x3 board matrix, turn management, 8 win condition checks, draw detection, and socket events (`ttt:move`, `ttt:state`, `ttt:win`, `ttt:draw`, `ttt:rematch`).
2. **M6-05 to M6-09** → Client `TicTacToe.jsx` UI (3x3 grid, turn indicator, interactive markers, win line highlight).
3. **M6-10 to M6-12** → Game over screen with instant Rematch mechanism, swap X/O, and score saving.

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
| M6 | Tic Tac Toe | 🔄 In Progress | — |
| M7 | Leaderboard | 🔲 Not Started | — |
| M8 | Phase 1 QA & Deploy | 🔲 Not Started | — |
| M9 | In-Room Chat | 🔲 Not Started | — |
| M10 | Player Profiles & History | 🔲 Not Started | — |
| M11 | UNO | 🔲 Not Started | — |
| M12 | Flappy Race | 🔲 Not Started | — |
| M13 | Chess | 🔲 Not Started | — |
| M14 | Emoji Guessing | 🔲 Not Started | — |
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
