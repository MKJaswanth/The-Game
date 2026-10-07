# 🎮 The Game — Project Documentation

> A browser-based multiplayer gaming hub for your team. No downloads, no passwords — just enter a nickname and play.

---

## 📌 Vision

**The Game** is an internal team gaming platform where anyone can jump in, pick a nickname, and instantly play a variety of casual, multiplayer, and party games directly in the browser. The platform features a live lobby showing who's online, real-time game rooms, and a persistent leaderboard to fuel friendly competition.

---

## 📏 Business Rules

> These rules never change without updating this file first.

| Rule | Detail |
|---|---|
| **No passwords** | Auth is nickname-only. Never store passwords or emails. |
| **Server is truth** | All game logic runs server-side. Clients only render. No client-side cheating. |
| **One task at a time** | Only one `Doing` item in `TASKS.md` at any time. |
| **Docs before code** | No feature gets built without a User Story in `USER_STORIES.md`. |
| **Sequential milestones** | Milestones complete in order. Never skip. See `MILESTONES.md`. |
| **No paid infra at MVP** | Use Supabase free tier, Vercel free, Render/Railway free. |
| **Score on server** | Scores submitted via REST API only. Never accept scores from client directly. |
| **Graceful failure** | Every async operation has a loading state and an error state. No silent failures. |
| **No alerts** | Use styled inline UI messages. Never `window.alert()`. |
| **Mobile works** | Every page must be functional at 360px minimum width. |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React (Vite) | Fast, component-driven UI |
| **Styling** | Vanilla CSS + CSS Variables | Full control, zero bloat |
| **Fonts** | Google Fonts (Outfit / Inter) | Premium look |
| **Real-time** | Socket.IO (client) | Live lobby, game sync |
| **Backend** | Node.js + Express | API + Socket.IO server |
| **Real-time server** | Socket.IO (server) | Multiplayer game state |
| **Database** | Supabase (PostgreSQL) | Leaderboards, scores, sessions |
| **Deployment** | Vercel (frontend) + Railway/Render (backend) | Free tier friendly |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│           React Frontend            │
│  (Vite + Socket.IO Client)          │
│  - Lobby UI                         │
│  - Game UIs (per game)              │
│  - Leaderboard                      │
└──────────────┬──────────────────────┘
               │ HTTP (REST) + WebSocket
               ▼
┌─────────────────────────────────────┐
│        Node.js + Express            │
│      + Socket.IO Server             │
│  - Session management               │
│  - Room/lobby management            │
│  - Game state engine (per game)     │
│  - REST API for scores/leaderboard  │
└──────────────┬──────────────────────┘
               │ Supabase JS SDK
               ▼
┌─────────────────────────────────────┐
│        Supabase (PostgreSQL)        │
│  - players table                    │
│  - scores table                     │
│  - game_sessions table              │
└─────────────────────────────────────┘
```

---

## 🎮 Game Catalog

### Phase 1 — Launch Games (MVP)
| # | Game | Type | Players |
|---|---|---|---|
| 1 | **Snake** | Single-player (score attack) | 1 |
| 2 | **Trivia Battle** | Real-time multiplayer quiz | 2–8 |
| 3 | **Word Scramble** | Real-time multiplayer | 2–6 |
| 4 | **Tic Tac Toe** | Turn-based multiplayer | 2 |

### Phase 2 — Growth
| # | Game | Type | Players |
|---|---|---|---|
| 5 | **UNO** | Card game, real-time | 2–6 |
| 6 | **Flappy Race** | Competitive Flappy Bird | 1–4 |
| 7 | **Chess** | Turn-based | 2 |
| 8 | **Emoji Guessing** | Party game | 2–8 |

### Phase 3 — Advanced
| # | Game | Type | Players |
|---|---|---|---|
| 9 | **Skribbl-style Drawing** | Multiplayer drawing/guessing | 2–8 |
| 10 | **Ludo** | Board game | 2–4 |

---

## 📁 Folder Structure

```
the-game/
├── client/                         # React (Vite) frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/                 # Icons, images
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── PlayerCard.jsx
│   │   │   ├── GameCard.jsx
│   │   │   ├── Lobby.jsx
│   │   │   └── Leaderboard.jsx
│   │   ├── games/                  # Each game is self-contained
│   │   │   ├── snake/
│   │   │   │   ├── Snake.jsx
│   │   │   │   └── snake.css
│   │   │   ├── trivia/
│   │   │   │   ├── Trivia.jsx
│   │   │   │   └── trivia.css
│   │   │   ├── wordscramble/
│   │   │   └── tictactoe/
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing + nickname entry
│   │   │   ├── GameHub.jsx         # Main lobby / game browser
│   │   │   ├── Room.jsx            # Active game room
│   │   │   └── Leaderboard.jsx     # Global leaderboard page
│   │   ├── socket/
│   │   │   └── socket.js           # Socket.IO client instance
│   │   ├── context/
│   │   │   └── PlayerContext.jsx   # Global player/nickname state
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css               # Global design system
│   └── package.json
│
├── server/                         # Node.js + Express backend
│   ├── src/
│   │   ├── index.js                # Entry point
│   │   ├── socket/
│   │   │   ├── index.js            # Socket.IO setup
│   │   │   ├── lobby.js            # Lobby socket events
│   │   │   └── games/
│   │   │       ├── trivia.js       # Trivia game engine
│   │   │       ├── wordscramble.js
│   │   │       └── tictactoe.js
│   │   ├── routes/
│   │   │   ├── leaderboard.js      # GET /api/leaderboard
│   │   │   └── scores.js           # POST /api/scores
│   │   ├── db/
│   │   │   └── supabase.js         # Supabase client
│   │   └── utils/
│   │       └── gameHelpers.js
│   └── package.json
│
├── PROJECT.md                      # ← You are here
├── .env.example
└── README.md
```

---

## 🗄️ Database Schema (Supabase / PostgreSQL)

### `players`
```sql
CREATE TABLE players (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname     TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMP DEFAULT now(),
  total_score  INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0
);
```

### `game_sessions`
```sql
CREATE TABLE game_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type  TEXT NOT NULL,          -- 'trivia', 'snake', etc.
  room_code  TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT now(),
  ended_at   TIMESTAMP,
  status     TEXT DEFAULT 'waiting'  -- 'waiting', 'active', 'finished'
);
```

### `scores`
```sql
CREATE TABLE scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID REFERENCES players(id),
  session_id UUID REFERENCES game_sessions(id),
  game_type  TEXT NOT NULL,
  score      INTEGER NOT NULL,
  won        BOOLEAN DEFAULT false,
  played_at  TIMESTAMP DEFAULT now()
);
```

---

## 🔌 Socket.IO Event Design

### Lobby Events
| Event | Direction | Payload | Description |
|---|---|---|---|
| `player:join` | Client → Server | `{ nickname }` | Player enters the hub |
| `lobby:update` | Server → Client | `{ players[] }` | Live online players list |
| `player:leave` | Client → Server | `{ nickname }` | Player disconnects |

### Room Events
| Event | Direction | Payload | Description |
|---|---|---|---|
| `room:create` | Client → Server | `{ gameType, nickname }` | Create a game room |
| `room:join` | Client → Server | `{ roomCode, nickname }` | Join an existing room |
| `room:state` | Server → Client | `{ players[], status }` | Room state update |
| `room:start` | Client → Server | `{ roomCode }` | Host starts the game |
| `room:leave` | Client → Server | `{ roomCode, nickname }` | Player leaves room |

### Game Events (example: Trivia)
| Event | Direction | Payload | Description |
|---|---|---|---|
| `trivia:question` | Server → Client | `{ question, options, timeLimit }` | Send question to all |
| `trivia:answer` | Client → Server | `{ answer, nickname }` | Player submits answer |
| `trivia:result` | Server → Client | `{ correct, scores }` | Round result broadcast |
| `trivia:end` | Server → Client | `{ finalScores[], winner }` | Game over |

---

## 🌐 REST API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/leaderboard` | Top 20 all-time scores |
| `GET` | `/api/leaderboard/:gameType` | Leaderboard per game type |
| `POST` | `/api/scores` | Submit a new score |
| `GET` | `/api/players/:nickname` | Get player stats |
| `POST` | `/api/players` | Register / upsert a nickname |

---

## 🎨 UI/UX Design System

### Color Tokens
```css
--color-bg:       #0d0f1a;   /* Deep dark navy */
--color-surface:  #161928;   /* Card backgrounds */
--color-primary:  #7c3aed;   /* Vibrant violet */
--color-accent:   #06b6d4;   /* Cyan pop */
--color-text:     #e2e8f0;
--color-muted:    #64748b;
--radius-card:    16px;
--shadow-glow:    0 0 24px rgba(124,58,237,0.3);
```

### Pages

#### 🏠 Home / Landing
- Full-screen hero with animated floating game icons
- Headline: **"Enter. Play. Win."**
- Nickname input + Join button
- Preview tiles of available games

#### 🕹️ Game Hub (Lobby)
- Live online players sidebar (Socket.IO powered)
- Game card grid — name, type badge, active rooms count
- Quick Play (auto-match) + Create Room + Join by code

#### 🎮 Game Room & Gameplay Progression
- Room code + copy-invite button
- Match format banner: displays exact round count, time limit, and game-end criteria before start
- Player list with host badges and ready controls
- **Visual Round Stepper:** 10-step progress indicator (`[✓]...[N]`), remaining rounds counter `(X rounds left)`, and final round warning (`🔥 FINAL ROUND`)
- Centered game canvas / interaction interface
- Real-time room scoreboard and intermission timer
- Automatic game conclusion upon final round with podium rankings and score submission

#### 🏆 Leaderboard
- Global top scores table
- Filter tabs per game type
- Auto-generated player avatars (initial + color)
- Animated rank badges

---

## 🗺️ Development Roadmap

### ✅ Phase 0 — Setup
- [ ] Initialize Vite React client
- [ ] Initialize Node.js + Express server
- [ ] Connect Socket.IO client ↔ server
- [ ] Set up Supabase project + run DB schema migrations
- [ ] Basic routing: Home → Game Hub → Room
- [ ] Global design system (CSS variables, fonts, base styles)

### 🚧 Phase 1 — MVP
- [ ] Nickname-based session (PlayerContext + localStorage)
- [ ] Live lobby (who's online, Socket.IO)
- [ ] **Snake** — single-player, score submission
- [ ] **Trivia Battle** — real-time multiplayer
- [ ] **Tic Tac Toe** — turn-based multiplayer
- [ ] Global leaderboard page

### 📦 Phase 2 — Growth
- [ ] **Word Scramble** game
- [ ] **UNO** card game
- [ ] In-room chat sidebar
- [ ] Player profile & stats page
- [ ] Game history log

### 🏁 Phase 3 — Polish
- [ ] **Drawing / Guessing** game (Skribbl-style)
- [ ] **Ludo** board game
- [ ] Sound effects & music toggle
- [ ] Full mobile responsiveness
- [ ] PWA support (installable)

---

## ⚙️ Environment Variables

```env
# server/.env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
CLIENT_URL=http://localhost:5173

# client/.env
VITE_SERVER_URL=http://localhost:4000
```

---

## 🚀 Getting Started (Local Dev)

```bash
# 1. Clone the repo
git clone <repo-url>
cd the-game

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Add your .env files (see above)

# 4. Run both servers (two terminals)
# Terminal 1 — Backend:
cd server && npm run dev

# Terminal 2 — Frontend:
cd client && npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:4000
```

---

## 📝 Decision Log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-06 | Chose React + Node.js + Socket.IO | Best balance of real-time multiplayer + dev flexibility |
| 2026-10-06 | Nickname-only auth (no passwords) | Low friction for team use |
| 2026-10-06 | Supabase for DB | Free tier, instant setup, great JS SDK |
| 2026-10-06 | Monorepo structure (client + server) | Easier to manage in one repo |

---

> **Built for the team. By the team. Let the games begin. 🎮**
