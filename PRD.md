# 📋 Product Requirements Document (PRD)
## The Game — Browser-Based Team Gaming Hub

**Version:** 1.0  
**Date:** 2026-10-06  
**Status:** Active  
**Owner:** Team  

---

## 1. Problem Statement

The team is bored. There is no shared space where teammates can casually jump into a game together without installing apps, creating accounts, or jumping through hoops. Existing platforms (Steam, Discord games, etc.) require setup, accounts, or are too complex for a quick break-time game.

---

## 2. Objective

Build **The Game** — a lightweight, browser-only multiplayer gaming hub where any teammate can:
- Enter a nickname (no signup required)
- See who else is online in real-time
- Jump into or host a game instantly
- Track wins and scores on a leaderboard

---

## 3. Target Users

| User Type | Description |
|---|---|
| **Primary** | Team members looking for a quick fun break |
| **Secondary** | Any invited person with the site URL |

**User count estimate:** 5–20 concurrent users (small team, internal use)

---

## 4. Scope

### ✅ In Scope (MVP)
- Nickname-based sessions (no email/password)
- Live lobby showing online players
- 3 games: Snake, Trivia Battle, Tic Tac Toe
- Game room creation and joining (by room code)
- Score submission and global leaderboard
- Responsive UI (desktop-first, mobile-friendly)

### ❌ Out of Scope (MVP)
- Social login (Google, GitHub, etc.)
- Persistent user accounts / profiles
- Monetization / ads
- Mobile native app
- Chat (deferred to Phase 2)
- Sound effects (deferred to Phase 2)
- More than 3 games at launch

---

## 5. Features & Requirements

---

### 5.1 — Authentication & Sessions

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | User enters a nickname (3–20 alphanumeric chars) on the home page | 🔴 Must Have |
| AUTH-02 | Nickname is stored in `localStorage` for the session | 🔴 Must Have |
| AUTH-03 | Nickname is unique in the current active lobby (not globally) | 🔴 Must Have |
| AUTH-04 | If nickname is taken by an active player, show an error | 🔴 Must Have |
| AUTH-05 | On browser close/refresh, player is removed from the live lobby | 🔴 Must Have |
| AUTH-06 | Nickname is registered in Supabase `players` table on first use | 🟡 Should Have |

---

### 5.2 — Live Lobby

| ID | Requirement | Priority |
|---|---|---|
| LOBBY-01 | Show a real-time list of all players currently online | 🔴 Must Have |
| LOBBY-02 | Player list updates instantly when someone joins or leaves | 🔴 Must Have |
| LOBBY-03 | Each player entry shows nickname + avatar (initials-based) | 🔴 Must Have |
| LOBBY-04 | Show a count of total players online | 🔴 Must Have |
| LOBBY-05 | Show which players are in a game vs. in the lobby | 🟡 Should Have |

---

### 5.3 — Game Hub (Browse Games)

| ID | Requirement | Priority |
|---|---|---|
| HUB-01 | Display all available games as cards in a grid | 🔴 Must Have |
| HUB-02 | Each game card shows: name, description, player count range, type badge | 🔴 Must Have |
| HUB-03 | Each game card shows number of currently active rooms | 🟡 Should Have |
| HUB-04 | Player can click a game to see options: Create Room / Join Room / Quick Play | 🔴 Must Have |
| HUB-05 | Quick Play auto-matches player into an open room or creates one | 🟡 Should Have |

---

### 5.4 — Room Management

| ID | Requirement | Priority |
|---|---|---|
| ROOM-01 | Player can create a room for any game | 🔴 Must Have |
| ROOM-02 | Room is assigned a unique 6-character code (e.g., `XK92MN`) | 🔴 Must Have |
| ROOM-03 | Player can join a room by entering the room code | 🔴 Must Have |
| ROOM-04 | Room shows list of players + their ready status | 🔴 Must Have |
| ROOM-05 | Creator (host) can start the game when enough players are ready | 🔴 Must Have |
| ROOM-06 | Room code is copyable via a button | 🟡 Should Have |
| ROOM-07 | Max player limit is enforced per game type | 🔴 Must Have |
| ROOM-08 | If host disconnects, host role transfers to next player | 🟡 Should Have |
| ROOM-09 | Players can leave a room and return to the lobby | 🔴 Must Have |

---

### 5.5 — Game: Snake 🐍

| ID | Requirement | Priority |
|---|---|---|
| SNAKE-01 | Classic snake gameplay on a grid canvas | 🔴 Must Have |
| SNAKE-02 | Arrow key + WASD controls | 🔴 Must Have |
| SNAKE-03 | Game ends on wall or self-collision | 🔴 Must Have |
| SNAKE-04 | Score = number of food items eaten | 🔴 Must Have |
| SNAKE-05 | Score is submitted to Supabase on game over | 🔴 Must Have |
| SNAKE-06 | Display personal best score during play | 🟡 Should Have |
| SNAKE-07 | Increasing speed as score grows | 🟡 Should Have |

---

### 5.6 — Game: Trivia Battle 🧠

| ID | Requirement | Priority |
|---|---|---|
| TRIVIA-01 | 2–8 players in one room | 🔴 Must Have |
| TRIVIA-02 | Server sends one question at a time to all players simultaneously | 🔴 Must Have |
| TRIVIA-03 | Each question has 4 multiple-choice options | 🔴 Must Have |
| TRIVIA-04 | Players have 15 seconds to answer | 🔴 Must Have |
| TRIVIA-05 | Faster correct answers earn more points (speed bonus) | 🟡 Should Have |
| TRIVIA-06 | After each question, show correct answer + current scores | 🔴 Must Have |
| TRIVIA-07 | 10 questions per round | 🔴 Must Have |
| TRIVIA-08 | Winner is player with highest score at the end | 🔴 Must Have |
| TRIVIA-09 | Final scores are submitted to Supabase | 🔴 Must Have |
| TRIVIA-10 | Questions fetched from Open Trivia DB API (opentdb.com) | 🟡 Should Have |
| TRIVIA-11 | Fallback: local question bank JSON if API is unavailable | 🔴 Must Have |

---

### 5.7 — Game: Tic Tac Toe ❌⭕

| ID | Requirement | Priority |
|---|---|---|
| TTT-01 | Exactly 2 players per room | 🔴 Must Have |
| TTT-02 | Classic 3x3 grid | 🔴 Must Have |
| TTT-03 | Players alternate turns; server enforces turn order | 🔴 Must Have |
| TTT-04 | Server validates win/draw conditions | 🔴 Must Have |
| TTT-05 | Show whose turn it is clearly in the UI | 🔴 Must Have |
| TTT-06 | Highlight winning cells on game end | 🟡 Should Have |
| TTT-07 | Option to rematch without leaving the room | 🟡 Should Have |
| TTT-08 | Win is recorded in Supabase scores table | 🔴 Must Have |

---

### 5.8 — Leaderboard

| ID | Requirement | Priority |
|---|---|---|
| LB-01 | Display top 20 all-time scores globally | 🔴 Must Have |
| LB-02 | Filter leaderboard by game type (Snake, Trivia, Tic Tac Toe) | 🔴 Must Have |
| LB-03 | Each row shows: Rank, Nickname, Avatar, Score, Game, Date | 🔴 Must Have |
| LB-04 | Leaderboard data fetched from Supabase via REST API | 🔴 Must Have |
| LB-05 | Highlight current player's own entries | 🟡 Should Have |
| LB-06 | Leaderboard auto-refreshes every 60 seconds | 🟡 Should Have |

---

### 5.9 — UI / UX

| ID | Requirement | Priority |
|---|---|---|
| UI-01 | Dark theme with violet/cyan color scheme | 🔴 Must Have |
| UI-02 | Google Font (Outfit) loaded for all text | 🔴 Must Have |
| UI-03 | Fully navigable via React Router (no full page reloads) | 🔴 Must Have |
| UI-04 | Desktop-first, min-width 768px supported | 🔴 Must Have |
| UI-05 | Mobile layout functional (360px min-width) | 🟡 Should Have |
| UI-06 | Loading states shown during socket/API operations | 🔴 Must Have |
| UI-07 | Error messages shown inline (not alerts) | 🔴 Must Have |
| UI-08 | Smooth page transitions (fade) | 🟢 Nice to Have |
| UI-09 | Game cards animate on hover | 🟢 Nice to Have |

---

## 6. Non-Functional Requirements

| NFR | Requirement |
|---|---|
| **Performance** | Page load < 2s on average connection |
| **Latency** | Socket events delivered < 200ms on LAN/local |
| **Reliability** | Graceful disconnect handling — no room should crash on player leave |
| **Security** | No sensitive data stored. Nicknames only. No passwords ever. |
| **Scalability** | Designed for 5–20 concurrent users. No need for horizontal scaling at MVP. |
| **Browser Support** | Chrome, Firefox, Edge (latest 2 versions) |

---

## 7. Technical Constraints

- No paid services at MVP (use Supabase free tier, Vercel free, Render free)
- All game logic validated **server-side** (Socket.IO) to prevent cheating
- Frontend must work without a build step during dev (Vite HMR)
- No TypeScript at MVP — plain JavaScript for speed (can migrate later)

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Team members who play at least once | 100% of team |
| Average session duration | > 10 minutes |
| Games playable without bugs | 3/3 at launch |
| Time to first game from entering nickname | < 30 seconds |

---

## 9. Open Questions

| # | Question | Status |
|---|---|---|
| Q1 | Should Snake be competitive (multiple players, same screen) or solo? | ⏳ Pending |
| Q2 | Do we want a permanent URL or just run locally on LAN? | ⏳ Pending |
| Q3 | Who manages the Supabase project credentials? | ⏳ Pending |
| Q4 | Should trivia categories be selectable by the room host? | ⏳ Pending |

---

## 10. Dependencies

| Dependency | Purpose | Risk |
|---|---|---|
| Supabase | Database + score persistence | Low — free tier sufficient |
| Open Trivia DB API | Trivia questions | Medium — need fallback JSON |
| Socket.IO | Real-time multiplayer | Low — mature library |
| Vercel | Frontend hosting | Low |
| Render / Railway | Backend hosting | Low — free tier has cold starts |

---

> **This document is the source of truth for what we are building. Any feature not listed here is out of scope until added here first.**
