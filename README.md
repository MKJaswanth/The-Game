# The Game 🎮

A real-time multiplayer gaming hub built for teams and friends. Pick a nickname, create or join a room with a 6-character code, or play solo across a variety of fast-paced arcade and party games.

---

## 🚀 Live Games

1. **🐍 Snake:** Classic arcade survival score attack with speed progression and leaderboard submission.
2. **🔤 Word Scramble:** Real-time multiplayer word-unscrambling race featuring 266 words across 3 difficulty tiers, speed bonuses, and a visual 10-round stepper.
3. **🧠 Trivia Battle:** Fast-paced 10-question quiz battle with Open Trivia DB integration, 60-question fallback bank, 15-second timers, speed bonus scoring, and winner podiums.
4. **❌⭕ Tic Tac Toe:** 1v1 turn-based tactical duel with instant rematches and a CyberBot opponent.
5. **🃏 UNO:** Full 108-card deck for 2–8 players — Skips, Reverses, Draw 2, Wilds, Wild +4, forced draw stacks, the UNO! call with a 5-second **Catch!** penalty, and card-point scoring.
6. **🐦 Flappy Race:** Server-authoritative 1–4 player survival race. Everyone flies the same pipe course; last bird flying wins and every racer's pipes are saved to the leaderboard.
7. **♟️ Chess:** Full-rules 1v1 with server-validated moves, legal-move highlighting, check/checkmate detection, draw offers, resign, colour-swapping rematches and a promotion picker.
8. **🤔 Emoji Guessing:** A party game for 2–8 players — one player turns a secret phrase into emoji, everyone else races to decode it. Five rounds, rotating clue-giver, speed scoring.
9. **🎨 Draw & Guess:** Real-time shared-canvas party game for 2–8 players with rotating drawers, speed scoring, and five rounds.
10. **🎲 Ludo:** Server-authoritative 2–4 player board race with dice, four tokens, safe squares, captures, home lanes, and rematches.
11. **🔴 Connect Four:** Local solo drop-four match against ConnectBot with touch-friendly column controls.

All eleven games are listed on the landing page and in the hub, each with its player count and live/soon state pulled from a single shared catalog.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19 + Vite SPA with a custom graphite-arcade design system and Outfit typography.
- **Backend:** Node.js + Express authoritative server.
- **Real-Time Engine:** Socket.IO for synchronized game states, timers, and room presences.
- **Database:** Supabase (PostgreSQL) for player statistics and leaderboard persistence.

---

## 💻 Local Setup & Development

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/MKJaswanth/The-Game.git
cd The-Game

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 3. Environment Variables
Create `.env` in `server/` and `client/` following `.env.example`:

**`server/.env`:**
```env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
CLIENT_URL=http://localhost:5173
```

**`client/.env`:**
```env
VITE_SERVER_URL=http://localhost:4000
```

### 4. Game Engine Tests
With the backend running, each multiplayer engine has a socket-level suite:

```bash
node test-uno.mjs        # UNO
node test-uno-eight.mjs  # UNO eight-player capacity/privacy boundary
node test-flappy.mjs     # Flappy Race
node test-chess.mjs      # Chess (46 assertions)
node test-chess-clock.mjs # Chess inactivity clock (run with CHESS_TURN_MS <= 5000)
node test-emoji.mjs      # Emoji Guessing (5 full rounds)
node test-drawing.mjs    # Draw & Guess
node test-ludo.mjs       # Ludo
```

Sparring bots are available for manual UI checks: `chess-bot.mjs <ROOMCODE>` and `emoji-bot.mjs <ROOMCODE>`.

### 5. Running the App
Run both backend and frontend servers in separate terminals:

```bash
# Terminal 1 — Backend (Port 4000)
cd server
node src/index.js

# Terminal 2 — Frontend (Port 5173)
cd client
npm run dev
```

Visit `http://localhost:5173` or share your LAN IP (`http://<your-ip>:5173`) to play together!

### Port forwarding

For an IDE/SSH port-forwarded preview, forward **5173** while running the Vite
client. The Vite config proxies `/api`, `/health`, and `/socket.io` to the
backend on port 4000, so one forwarded port is enough. Leave
`VITE_SERVER_URL` unset in the client `.env` for this mode. Alternatively,
build the client and forward **4000** to use the single-service Express mode.
