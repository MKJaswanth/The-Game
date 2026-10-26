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
- [x] If the nickname is already taken by an active player, show: _"This nickname is already in use. Try another!"_
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
- [x] A waiting multiplayer room appears in the hub's live open-room list for other players

---

### US-006 — Join a Room by Code

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to join a friend's room by entering their room code, so that we can play in the same game session.

**Acceptance Criteria:**

- [x] "Join Room" modal has a room code input field
- [x] If code is invalid or room doesn't exist: _"Room not found. Check the code and try again."_
- [x] If room is full: _"This room is full!"_
- [x] If room's game has already started: _"Game already in progress."_
- [x] On valid code, player is taken into the room immediately

---

### US-006A — Join an Open Room Instantly

**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **player**, I want to see waiting rooms on the Game Hub, so that I can join a game without copying or entering a room code.

**Acceptance Criteria:**

- [x] The Game Hub shows live waiting rooms with the game name, host, room code, and current/max player count
- [x] Open-room entries update when a room is created, joined, filled, started, or closed
- [x] Clicking "Join now" joins the selected room and navigates to its lobby
- [x] Full, started, solo, and closed rooms are not shown as open rooms
- [x] If a room closes between listing and joining, an inline error explains that it is no longer available

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
- [x] Non-host players see: _"Waiting for host to start..."_

---

### US-009 — Leave a Room

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to leave a room and return to the Game Hub, so that I can choose a different game.

**Acceptance Criteria:**

- [x] A "Leave Room" button is visible in the room screen
- [x] On leaving, player is returned to the Game Hub
- [x] Remaining players in the room are notified: _"[Nickname] left the room."_
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
- [x] A success confirmation is shown: _"Score saved! 🎉"_
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

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to play Tic Tac Toe against a teammate in real-time, so that we can have a quick head-to-head match.

**Acceptance Criteria:**

- [x] 2-player room only; game starts when both players are present and host clicks Start (or solo vs CyberBot)
- [x] Board is a 3x3 clickable grid
- [x] Players are assigned X and O; server enforces turn order
- [x] Clicking a cell places your mark only on your turn
- [x] Clicking on another player's turn shows: _"It's [nickname]'s turn!"_
- [x] Win is detected server-side; winning cells are highlighted
- [x] Draw is detected and shown as a draw screen
- [x] Score/win is submitted to Supabase on game end

---

### US-015 — Rematch in Tic Tac Toe

**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **player**, I want to request a rematch after a game ends, so that we don't have to re-create the room each time.

**Acceptance Criteria:**

- [x] Both players see "Rematch?" button on the end screen
- [x] If both click it, the board resets and a new game starts
- [x] X/O assignments swap for the rematch
- [x] If one player declines or leaves, the other is notified

---

## 🏆 Epic 6: Leaderboard

---

### US-016 — View the Leaderboard

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to see a leaderboard of top scores, so that I can see how I rank against my teammates.

**Acceptance Criteria:**

- [x] Leaderboard page is accessible from the main navbar
- [x] Shows top 20 scores by default (all games combined)
- [x] Columns: Rank, Player Avatar, Nickname, Score, Game, Date
- [x] Filter tabs for: All Games | Snake | Trivia | Tic Tac Toe | Word Scramble
- [x] Data is fetched from Supabase via `/api/leaderboard`
- [x] Page shows a loading state while data is fetching
- [x] Shows _"No scores yet — be the first!"_ if empty

---

### US-017 — See My Own Scores Highlighted

**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **player**, I want my own entries to be highlighted on the leaderboard, so that I can quickly find my scores.

**Acceptance Criteria:**

- [x] Rows matching the current player's nickname are highlighted with a distinct background
- [x] A "You" badge appears next to the player's own entries

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

## 💬 Epic 9: In-Room Chat

---

### US-022 — In-Room Real-Time Chat

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player in a game room**, I want to send and receive text messages with teammates in the room in real time, so that we can communicate, banter, and coordinate while waiting or playing.

**Acceptance Criteria:**

- [x] Chat panel is integrated into the Room page (prominently displayed during waiting/lobby stage, hidden during active gameplay with optional drawer toggle)
- [x] Sending a message broadcasts to all players in the same room via Socket.IO `chat:message` event
- [x] Messages display sender nickname, avatar badge, formatted timestamp (e.g. HH:MM), and message text
- [x] Current player's sent messages are visually distinguished (e.g. highlighted bubble, "YOU" badge)
- [x] Auto-scroll smoothly keeps the latest message visible as new messages arrive
- [x] System alerts automatically announce when a player joins or leaves the room (`[Player] joined the room`, `[Player] left the room`)
- [x] Enter key sends the message; clicking the send button also submits
- [x] Input field is cleared immediately upon successful sending
- [x] Max message length is strictly 200 characters, validated both client-side and server-side
- [x] Empty or whitespace-only messages are blocked
- [x] Chat UI is responsive down to 360px mobile width and does not obscure game controls

---

## 🃏 Epic 10: UNO Card Game

---

### US-025 — Play UNO

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to play a full game of UNO with 2–8 friends in a room, so that we can enjoy a polished card battle in real time.

**Acceptance Criteria:**

- [x] UNO room supports 2–8 players with host controls and Start Game gating
- [x] Every player is dealt 7 cards from a shuffled 108-card deck (4 colors × numbers/Skip/Reverse/+2, plus Wild and Wild +4)
- [x] A non-wild card is flipped as the starting discard pile
- [x] Turn order rotates with the current player clearly highlighted; out-of-turn plays are rejected server-side
- [x] A card is playable only if it matches the top card's color or symbol, or is a Wild
- [x] "Draw" button pulls one card from the deck and passes the turn; deck reshuffles from the discard pile when empty
- [x] Each player's hand stays private — only own cards are visible to that player
- [x] Opponents are shown as face-down card stacks with live card counts
- [x] An eight-player room keeps every hand private while the opponent rail remains usable on desktop and mobile
- [x] A visible turn-order table shows the current player, the next player, direction, seat order, card counts, and the player after the current player

---

### US-026 — UNO Special Cards, UNO! Call & Win

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want special cards, the UNO! call, and automatic scoring so that matches end with a clear winner saved to the leaderboard.

**Acceptance Criteria:**

- [x] Skip, Reverse, Draw 2, Wild (choose color), and Wild Draw 4 all work with correct turn effects
- [x] A pending Draw 2 / Wild +4 forces the next player to draw and skip their turn
- [x] Wild cards open a color-picker dialog; the chosen color applies to the pile
- [x] When a player is reduced to 1 card, an "UNO!" call button appears; failing to call within 5s can be penalized with a "Catch!" (+2 cards)
- [x] Playing the last card instantly wins the round and emits `uno:end` with standings and winner
- [x] Winner's score (sum of opponents' remaining card points) is auto-submitted to `/api/scores`
- [x] Final screen shows the winner podium, standings, "Play Again", and "Back to Hub"

---

## 🐦 Epic 11: Flappy Race

---

### US-027 — Race Friends in Flappy

**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **player**, I want to race up to 3 friends through the same pipe course so that a survival arcade game becomes a social competition.

**Acceptance Criteria:**

- [x] Flappy Race rooms support 1–4 players; a solo room starts immediately
- [x] Everyone flaps with Space / ArrowUp / click / tap and flies the same pipe course side by side
- [x] Physics (gravity, flap impulse, scroll speed, pipe gap) are simulated on the server — clients cannot cheat
- [x] Each player's score equals the pipes they have personally passed
- [x] Rival birds are rendered as labelled ghost outlines in the same canvas, with live scores on a race HUD
- [x] Hitting a pipe or the ground crashes that bird; crashed birds become spectators and cannot flap again
- [x] The race ends when every bird has crashed (or the last survivor finishes)
- [x] Winner is the last bird standing, with highest score then longest survival as tie-breakers
- [x] Final screen shows ranked finishes with each player's pipes passed, plus "Race Again" and "Back to Hub"
- [x] Every racer's score is submitted to `/api/scores` as game type `flappy` and appears on the leaderboard

---

## ♟️ Epic 12: Chess

---

### US-028 — Play a Game of Chess

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want to play a full 1v1 chess match with a friend in a room, so that we can play a real strategy game on the same board state.

**Acceptance Criteria:**

- [x] Chess rooms hold exactly 2 players and the host can only start once both seats are filled
- [x] The server owns the game and validates every move with `chess.js` — illegal moves and out-of-turn moves are rejected
- [x] The board renders an 8×8 alternating grid with Unicode piece glyphs, oriented to the player's colour
- [x] Clicking one of your pieces highlights every legal destination, with capture targets ringed in red
- [x] Clicking a legal destination plays the move; both players see the new position immediately
- [x] Pawn promotions open a queen / rook / bishop / knight picker
- [x] The board is locked while it is not your turn, and an opponent's pieces can never be selected
- [x] Last move squares and both captured-piece trays are shown, with SAN move history
- [x] Both players see the same position, turn indicator and move list

---

### US-029 — Check, Checkmate, Draw & Rematch

**Status:** ✅ Done  
**Priority:** 🔴 Must Have

> As a **player**, I want the game to call check, checkmate, stalemate and draws for me, and to offer a rematch afterwards.

**Acceptance Criteria:**

- [x] A king in check is highlighted and the status line warns the player in check
- [x] Checkmate ends the game with the winner named and the mate logged in SAN (e.g. `Qxf7#`)
- [x] Stalemate, threefold repetition, insufficient material and the fifty-move rule are reported as draws
- [x] Either player can offer a draw; the opponent can accept (game ends drawn) or decline (play continues)
- [x] The offerer cannot answer their own offer, and only seated players can offer or resign
- [x] Resigning asks for confirmation, then awards the win to the opponent
- [x] A player leaving mid-game forfeits to the opponent
- [x] Rematch requires both players' votes and swaps colours so the first move alternates
- [x] Results are stored in Supabase as game type `chess` (100 win / 50 draw / 0 loss) and surface on the leaderboard and profile

---

## 🤔 Epic 13: Emoji Guessing

---

### US-030 — Write and Decode Emoji Clues

**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **player**, I want to turn a secret phrase into emoji for my friends to decode, so that we get a fast, funny party game.

**Acceptance Criteria:**

- [x] Emoji rooms hold 2–8 players and the host starts once at least two seats are filled
- [x] Each round one clue-giver receives a secret answer from a 114-entry bank plus a category and a ready-made emoji hint
- [x] Only the clue-giver's socket ever receives the answer; everyone else gets only the answer length
- [x] The clue-giver composes a clue from an emoji palette (8 categories) with live preview, undo and clear
- [x] Sending the clue broadcasts it and opens a 60-second guess window; if the clue-giver stalls, the authored hint is auto-submitted after 30 s
- [x] Guessers see the emoji clue, a text input and a live guess feed; wrong guesses appear publicly as feedback
- [x] The clue-giver cannot guess their own round

---

### US-031 — Emoji Scoring, Rounds & Winner

**Status:** ✅ Done  
**Priority:** 🟡 Should Have

> As a **player**, I want points for speed and a rotating clue-giver, so that five rounds end with a clear winner.

**Acceptance Criteria:**

- [x] The first correct guess ends the round immediately; points scale from 60 to 100 with speed
- [x] The clue-giver earns 40 points whenever someone solves their clue
- [x] The answer is revealed after every round, along with who solved it (or that nobody did)
- [x] Five rounds are played and the clue-giver rotates through the room each round
- [x] A live score rail shows every player's total and who is currently the clue-giver
- [x] The final screen ranks players by score and names the winner, with Play Again and Leave
- [x] Rematch requires every seated player's vote and resets the scores
- [x] Scores are persisted to Supabase as game type `emoji` and appear on the leaderboard and profile
- [x] A player leaving mid-round hands the round on instead of stalling the game

---

## 🎨 Epic 14: Drawing & Guessing Game

---

### US-032 — Play a Drawing & Guessing Round

**Status:** ✅ Done
**Priority:** 🟡 Should Have

> As a **player**, I want one teammate to draw a secret word while the rest of us guess, so that we can play a fast collaborative party game.

**Acceptance Criteria:**

- [x] Drawing rooms hold 2–8 players and the host starts once at least two seats are filled
- [x] The server assigns one drawer per round and sends the secret word only to that drawer
- [x] The drawer can draw with a brush, choose colors, erase, and clear the shared canvas
- [x] Drawing strokes are broadcast in real time and late joiners can request the current canvas
- [x] Guessers see answer blanks, a guess input, and a live public guess feed
- [x] The drawer cannot submit guesses for their own round

---

### US-033 — Drawing Scores, Rounds & Winner

**Status:** ✅ Done
**Priority:** 🟡 Should Have

> As a **player**, I want fast correct guesses to earn more points and the drawer to receive a bonus, so that five rounds end with a clear winner.

**Acceptance Criteria:**

- [x] Correct guesses award speed-scaled points and the drawer earns a clue bonus
- [x] Wrong guesses appear publicly without revealing the answer
- [x] Each round lasts 80 seconds and reveals the answer before the next round
- [x] Five rounds rotate the drawer through the room
- [x] The final screen ranks players, names the winner, supports rematch voting, and saves scores

---

## 🎲 Epic 15: Ludo Board Game

---

### US-034 — Play Ludo

**Status:** ✅ Done
**Priority:** 🟡 Should Have

> As a **player**, I want to roll dice and move four tokens around a shared Ludo board, so that I can race my teammates to the home area.

**Acceptance Criteria:**

- [x] Ludo rooms support 2–4 players with each player assigned a color and four tokens
- [x] Dice rolls are generated and validated by the server
- [x] A player can roll only on their turn and can move only a legal token
- [x] Rolling a six releases a token from base and grants another roll after a valid move
- [x] The board shows each player's tokens, current turn, dice result, and legal move highlights

---

### US-035 — Ludo Captures, Win & Rematch

**Status:** ✅ Done
**Priority:** 🟡 Should Have

> As a **player**, I want captures, safe squares, and a clear finish state, so that the Ludo match feels complete and competitive.

**Acceptance Criteria:**

- [x] Tokens landing on an unsafe occupied square capture the opponent and send that token to base
- [x] Safe squares prevent captures
- [x] Tokens cannot overshoot the final home space
- [x] The first player to bring all four tokens home wins and scores are saved
- [x] The final screen shows standings and supports a full-room rematch

---

## 📝 Story Status Summary

| Epic                 | Total Stories | Done   | In Progress | Not Started |
| -------------------- | ------------- | ------ | ----------- | ----------- |
| 1 — Joining          | 3             | 3      | 0           | 0           |
| 2 — Browsing & Rooms | 6             | 6      | 0           | 0           |
| 3 — Snake            | 2             | 2      | 0           | 0           |
| 4 — Trivia           | 2             | 2      | 0           | 0           |
| 5 — Tic Tac Toe      | 2             | 2      | 0           | 0           |
| 6 — Leaderboard      | 2             | 2      | 0           | 0           |
| 7 — UI/UX            | 2             | 2      | 0           | 0           |
| 8 — Word Scramble    | 2             | 2      | 0           | 0           |
| 9 — In-Room Chat     | 1             | 1      | 0           | 0           |
| 10 — UNO Card Game   | 2             | 2      | 0           | 0           |
| 11 — Flappy Race     | 1             | 1      | 0           | 0           |
| 12 — Chess           | 2             | 2      | 0           | 0           |
| 13 — Emoji Guessing  | 2             | 2      | 0           | 0           |
| 14 — Drawing         | 2             | 2      | 0           | 0           |
| 15 — Ludo            | 2             | 2      | 0           | 0           |
| **Total**            | **33**        | **33** | **0**       | **0**       |

---

> **When implementing any feature, reference the story ID (e.g., US-005) in commit messages and comments. This keeps code traceable to requirements.**
