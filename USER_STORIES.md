# 📖 User Stories — The Game

**Version:** 1.0  
**Date:** 2026-10-06  
**Format:** `As a [user], I want to [action], so that [outcome].`  
**Status Key:** 🔲 Not Started | 🔄 In Progress | ✅ Done

---

## 🧑 Epic 1: Joining the Platform

---

### US-001 — Enter a Nickname
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **teammate**, I want to enter a nickname and join the hub without creating an account, so that I can start playing immediately without friction.

**Acceptance Criteria:**
- [x] Home page has a visible nickname input field and a "Join" button
- [x] Nickname must be 3–20 characters, alphanumeric only
- [x] If nickname is too short/long/invalid, show an inline error message
- [x] If the nickname is already taken by an active player, show: *"This nickname is already in use. Try another!"*
- [x] On success, player is redirected to the Game Hub
- [x] Nickname is saved in `localStorage` so it persists on refresh
- [x] Player appears in the live lobby within 1 second of joining

---

### US-002 — Rejoin with Saved Nickname
**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **returning teammate**, I want my nickname to be remembered when I revisit the site, so that I don't have to type it every time.

**Acceptance Criteria:**
- [x] If a valid nickname exists in `localStorage`, the input is pre-filled on the home page
- [x] Player can edit the pre-filled nickname before joining
- [x] One-click "Join as [nickname]" button shown if nickname is saved

---

### US-003 — Leave the Hub
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to be automatically removed from the online list when I close the tab, so that the lobby always shows accurate presence.

**Acceptance Criteria:**
- [x] On tab/browser close, the player's socket disconnects
- [x] Player is removed from the lobby list within 3 seconds of disconnection
- [x] All other players see the updated lobby list instantly

---

## 🕹️ Epic 2: Browsing & Joining Games

---

### US-004 — Browse Available Games
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to see all available games on the hub, so that I can pick one to play.

**Acceptance Criteria:**
- [x] Game Hub displays all available games as cards in a grid
- [x] Each card shows: game name, short description, player count (e.g., "1 player" or "2–8 players"), and game type badge (single / multiplayer / card)
- [x] Cards are clickable and open a game action modal
- [x] Unavailable/coming-soon games are shown as disabled cards with a "Coming Soon" badge

---

### US-005 — Create a Game Room
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to create a game room and share the code with my teammates, so that we can play together.

**Acceptance Criteria:**
- [x] Clicking "Create Room" for any multiplayer game creates a room
- [x] A unique 6-character room code is generated and displayed prominently
- [x] A "Copy Code" button copies the room code to clipboard
- [x] Creator is automatically placed in the room as the host
- [x] Room is listed in the active rooms for that game

---

### US-006 — Join a Room by Code
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to join a friend's room by entering their room code, so that we can play in the same game session.

**Acceptance Criteria:**
- [x] "Join Room" modal has a room code input field
- [x] If code is invalid or room doesn't exist: *"Room not found. Check the code and try again."*
- [x] If room is full: *"This room is full!"*
- [x] If room's game has already started: *"Game already in progress."*
- [x] On valid code, player is taken into the room immediately

---

### US-007 — See Who's in My Room
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player in a room**, I want to see all other players in the room before the game starts, so that I know who I'm playing with.

**Acceptance Criteria:**
- [x] Room screen shows a list of all joined players with their nicknames and avatars
- [x] List updates in real-time as players join or leave
- [x] Host is clearly marked with a crown icon or "Host" badge
- [x] Minimum player count requirement is shown (e.g., "Need 2 players to start")

---

### US-008 — Start a Game (Host)
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **room host**, I want to start the game when everyone is ready, so that we can begin playing.

**Acceptance Criteria:**
- [x] Only the host sees the "Start Game" button
- [x] "Start Game" is disabled if minimum player count is not met
- [x] Clicking "Start Game" transitions all players in the room to the game screen simultaneously
- [x] Non-host players see: *"Waiting for host to start..."*

---

### US-009 — Leave a Room
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to leave a room and return to the Game Hub, so that I can choose a different game.

**Acceptance Criteria:**
- [x] A "Leave Room" button is visible in the room screen
- [x] On leaving, player is returned to the Game Hub
- [x] Remaining players in the room are notified: *"[Nickname] left the room."*
- [x] If host leaves, the next player becomes the new host

---

## 🐍 Epic 3: Playing Snake

---

### US-010 — Play Snake
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to play Snake in the browser, so that I can kill time and compete for a high score.

**Acceptance Criteria:**
- [x] Game renders on a canvas element
- [x] Snake moves continuously; direction changed with Arrow keys or WASD
- [x] Food spawns randomly on the grid
- [x] Snake grows by 1 on eating food
- [x] Score increases by 1 per food eaten, displayed live on screen
- [x] Game ends (with Game Over screen) on wall or self-collision
- [x] Player can restart without leaving the page

---

### US-011 — Submit Snake Score
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want my Snake score to be saved automatically, so that I can appear on the leaderboard.

**Acceptance Criteria:**
- [x] On game over, score is submitted to `/api/scores` with nickname and game type
- [x] Submission happens automatically (no extra button click required)
- [x] A success confirmation is shown: *"Score saved! 🎉"*
- [x] If submission fails, a non-blocking error note is shown; game still works

---

## 🧠 Epic 4: Playing Trivia Battle

---

### US-012 — Play a Trivia Round
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player in a trivia room**, I want to answer quiz questions in real-time against my teammates, so that we can compete on knowledge.

**Acceptance Criteria:**
- [x] Host starts the game; all players receive Question 1 simultaneously
- [x] Question shows: question text + 4 answer options as buttons
- [x] A countdown timer (15 seconds) is visible and animated
- [x] Selecting an answer locks it in (cannot change)
- [x] After time expires or all answers submitted, results screen shows correct answer + who answered correctly
- [x] Points are displayed live after each question
- [x] Visual question stepper (10 steps) and "X questions left" badge clearly shows game end progression
- [x] Final question alert highlights Question 10 as the deciding round
- [x] 10 questions per game; round ends after Q10
- [x] Final screen shows winner and all scores

---

### US-013 — See Trivia Results
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to see the final scores and winner after a trivia game, so that we know who won.

**Acceptance Criteria:**
- [x] Final screen shows all players ranked by score
- [x] Winner is highlighted with a trophy icon
- [x] "Play Again" button (host only) restarts with new questions
- [x] "Back to Lobby" button returns to Game Hub
- [x] Scores are saved to Supabase automatically

---

## ❌ Epic 5: Playing Tic Tac Toe

---

### US-014 — Play Tic Tac Toe
**Status:** 🔲 Not Started  
**Priority:** 🔴 Must Have

> As a **player**, I want to play Tic Tac Toe against a teammate in real-time, so that we can have a quick head-to-head match.

**Acceptance Criteria:**
- [ ] 2-player room only; game starts when both players are present and host clicks Start
- [ ] Board is a 3x3 clickable grid
- [ ] Players are assigned X and O; server enforces turn order
- [ ] Clicking a cell places your mark only on your turn
- [ ] Clicking on another player's turn shows: *"It's [nickname]'s turn!"*
- [ ] Win is detected server-side; winning cells are highlighted
- [ ] Draw is detected and shown as a draw screen
- [ ] Score/win is submitted to Supabase on game end

---

### US-015 — Rematch in Tic Tac Toe
**Status:** 🔲 Not Started  
**Priority:** 🟡 Should Have

> As a **player**, I want to request a rematch after a game ends, so that we don't have to re-create the room each time.

**Acceptance Criteria:**
- [ ] Both players see "Rematch?" button on the end screen
- [ ] If both click it, the board resets and a new game starts
- [ ] X/O assignments swap for the rematch
- [ ] If one player declines or leaves, the other is notified

---

## 🏆 Epic 6: Leaderboard

---

### US-016 — View the Leaderboard
**Status:** 🔲 Not Started  
**Priority:** 🔴 Must Have

> As a **player**, I want to see a leaderboard of top scores, so that I can see how I rank against my teammates.

**Acceptance Criteria:**
- [ ] Leaderboard page is accessible from the main navbar
- [ ] Shows top 20 scores by default (all games combined)
- [ ] Columns: Rank, Player Avatar, Nickname, Score, Game, Date
- [ ] Filter tabs for: All Games | Snake | Trivia | Tic Tac Toe
- [ ] Data is fetched from Supabase via `/api/leaderboard`
- [ ] Page shows a loading state while data is fetching
- [ ] Shows *"No scores yet — be the first!"* if empty

---

### US-017 — See My Own Scores Highlighted
**Status:** 🔲 Not Started  
**Priority:** 🟡 Should Have

> As a **player**, I want my own entries to be highlighted on the leaderboard, so that I can quickly find my scores.

**Acceptance Criteria:**
- [ ] Rows matching the current player's nickname are highlighted with a distinct background
- [ ] A "You" badge appears next to the player's own entries

---

## 🎨 Epic 7: UI / Experience

---

### US-018 — Experience a Polished Dark UI
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want the site to look and feel premium, so that it's fun to use and not just a basic webpage.

**Acceptance Criteria:**
- [x] Dark background (#0d0f1a), violet primary (#7c3aed), cyan accent (#06b6d4)
- [x] Outfit font loaded from Google Fonts
- [x] All buttons have hover states with smooth transitions
- [x] Game cards animate subtly on hover (lift + glow)
- [x] No raw browser alerts used — all messages are styled UI elements
- [x] Loading spinners shown during any async operation

---

### US-019 — Navigate Without Page Reloads
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to navigate between pages smoothly without full reloads, so that the experience feels like a modern app.

**Acceptance Criteria:**
- [x] React Router handles all navigation
- [x] Browser back button works correctly
- [x] No full-page refreshes during normal navigation
- [x] Direct URL access to `/leaderboard` or `/hub` works correctly

---

---

## 🔤 Epic 8: Playing Word Scramble

---

### US-020 — Play a Word Scramble Round
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player in a Word Scramble room**, I want to unscramble scrambled words under time pressure against my teammates, so that we can test our vocabulary and quick-thinking speed.

**Acceptance Criteria:**
- [x] Host starts the game; all players receive Round 1 with the same scrambled letters simultaneously
- [x] A 30-second countdown timer runs concurrently for all players
- [x] Scrambled letters are displayed prominently in large, clear badges
- [x] Players can type their guess and submit via Enter or "Submit" button
- [x] Guess is validated server-side (case-insensitive)
- [x] Speed bonus is awarded based on seconds remaining when correct guess is submitted
- [x] When time expires or all players guess correctly, round result shows the revealed word and points earned
- [x] Visual 10-step round stepper and "X rounds left" badge clearly shows game end progression
- [x] Final round alert ("🔥 FINAL ROUND") highlights Round 10 as concluding word
- [x] 10 rounds played per game session

---

### US-021 — See Word Scramble Results & Save Scores
**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to view the final standings, celebrate the winner, and have my score saved automatically to the leaderboard.

**Acceptance Criteria:**
- [x] After 10 rounds, the final game over screen displays players ranked by total points
- [x] Winner is highlighted with trophy styling and congratulations
- [x] "Play Again" button lets room host start a fresh 10-round match
- [x] "Back to Hub" allows any player to leave
- [x] Final scores are submitted automatically to `/api/scores`

---

## 📝 Story Status Summary

| Epic | Total Stories | Done | In Progress | Not Started |
|---|---|---|---|---|
| 1 — Joining | 3 | 3 | 0 | 0 |
| 2 — Browsing & Rooms | 6 | 6 | 0 | 0 |
| 3 — Snake | 2 | 2 | 0 | 0 |
| 4 — Trivia | 2 | 2 | 0 | 0 |
| 5 — Tic Tac Toe | 2 | 0 | 0 | 2 |
| 6 — Leaderboard | 2 | 0 | 0 | 2 |
| 7 — UI/UX | 2 | 2 | 0 | 0 |
| 8 — Word Scramble | 2 | 2 | 0 | 0 |
| **Total** | **21** | **17** | **0** | **4** |

---

> **When implementing any feature, reference the story ID (e.g., US-005) in commit messages and comments. This keeps code traceable to requirements.**

