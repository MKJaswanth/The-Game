# The Game 🎮

A real-time multiplayer gaming hub built for teams and friends. Pick a nickname, create or join a room with a 6-character code, or play solo across a variety of fast-paced arcade and party games.

---

## 🚀 Live Games

1. **🐍 Snake:** Classic arcade survival score attack with speed progression and leaderboard submission.
2. **🔤 Word Scramble:** Real-time multiplayer word-unscrambling race featuring 266 words across 3 difficulty tiers, speed bonuses, and a visual 10-round stepper.
3. **🧠 Trivia Battle:** Fast-paced 10-question quiz battle with Open Trivia DB integration, 60-question fallback bank, 15-second timers, speed bonus scoring, and winner podiums.
4. **❌⭕ Tic Tac Toe:** *(In Progress)* 1v1 turn-based tactical duel with instant rematches.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19 + Vite SPA with custom dark glassmorphic design system and Outfit typography.
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

### 4. Running the App
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
