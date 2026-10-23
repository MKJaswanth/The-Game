# 🚀 Deployment Guide — The Game

This document provides step-by-step instructions for deploying "The Game" to production.

**Live:** https://the-game-31wo.onrender.com (Render free plan, single service, auto-deploys `main`).

---

## Architecture Overview

- **Frontend:** React 19 + Vite SPA
- **Backend:** Node.js (ESM) + Express + Socket.IO
- **Database:** PostgreSQL on **Supabase**

Two deployment shapes are supported:

| Shape | Services | Use when |
|---|---|---|
| **Single service** (recommended) | One Node web service serving the API, websockets **and** `client/dist` | You want one URL, one origin, zero CORS/websocket mismatch. `render.yaml` is already configured this way. |
| Split | Vercel (SPA) + Render/Railway (API) | You specifically want the CDN-hosted frontend. Requires `VITE_SERVER_URL` at build time. |

---

## 0. One-Click Path (Render Blueprint)

The repo root contains [`render.yaml`](render.yaml):

- **Build:** installs server + client deps and builds the SPA
- **Start:** `node server/src/index.js` (serves `client/dist` when it exists)
- **Health check:** `/health`

1. Push the repo to GitHub.

> **Pick the region closest to your players.** The websocket carries every move, so round-trip latency *is* the game's feel: a free instance in Oregon measured ~244 ms from India, which makes the reflex games (Flappy especially) hard to play. Render fixes the region at creation time — to change it, delete the service and re-create the Blueprint in the nearer region.
2. Render → **New + → Blueprint** → pick the repo (it reads `render.yaml`).
3. Fill the `sync: false` secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (all optional — the app runs without them, using the in-memory score store).
4. Deploy, then open the Render URL — landing page, all eight games and websockets share that one origin.

> The server prints `Serving built client from …` on boot when single-service mode is active. If it prints the “run npm run build” warning instead, the build step did not produce `client/dist`.

---

## 0b. Temporary Public URL (no account)

To share a working build without signing up for anything, run the production server locally and tunnel it:

```bash
cd client && npm run build && cd ../server && npm start
# in a second terminal
cloudflared tunnel --url http://localhost:4000
```

The tunnel URL serves the SPA, the REST API and the Socket.IO endpoint on one HTTPS origin. Quick tunnels are ephemeral — they die when the process stops — and the URL is publicly reachable, so treat it like a demo, not a production deployment.

---

## 1. Backend Deployment (split architecture)

### Option A: Render
1. Push this repository to GitHub.
2. Sign in to [render.com](https://render.com) and click **New + → Web Service**.
3. Connect your repository.
4. Set the following:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add Environment Variables:
   - `PORT`: `10000` (or leave default, Render sets this automatically)
   - `CLIENT_URL`: `https://your-frontend-app.vercel.app` (your Vercel URL)
   - `SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `SUPABASE_ANON_KEY`: `<your-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-service-role-key>`
6. Deploy! Render will assign a public HTTPS URL (e.g. `https://the-game-server.onrender.com`).

### Option B: Railway
1. Sign in to [railway.app](https://railway.app) and create a **New Project**.
2. Select **Deploy from GitHub repo**, choose this repository, and set Root Directory to `/server`.
3. Set the environment variables listed above.
4. Railway will deploy and assign an HTTPS URL with WebSocket support.

---

## 2. Frontend Deployment (Vercel)

1. Sign in to [vercel.com](https://vercel.com) and click **Add New... → Project**.
2. Import the GitHub repository.
3. Configure the Project Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - `VITE_SERVER_URL`: `https://your-backend-server.onrender.com` (from Step 1)
5. Click **Deploy**.
6. The SPA configuration is already included in [`client/vercel.json`](file:///c:/Users/ccl15/Documents/obisidian/nothing%20i%20guess/the-game/client/vercel.json) to handle client-side routing on page refresh.

---

## 3. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL schema from [`server/src/db/schema.sql`](file:///c:/Users/ccl15/Documents/obisidian/nothing%20i%20guess/the-game/server/src/db/schema.sql) in the Supabase SQL Editor.
3. Copy the Project URL and API Keys (Anon & Service Role) into the Backend environment variables.

---

## 4. Verification & QA Checklist

Run this against the deployed URL after every deploy.

**Shell**
- [x] Home page loads at the root URL and lists all eight games with live/soon tags
- [x] Entering a nickname joins the lobby and navigates to the Game Hub
- [x] A hard refresh on a deep link (`/room/ABC123`) still renders the SPA (not a 404)
- [x] `GET /health` returns `{"status":"ok"}`
- [x] Leaderboard loads, filters by every game tab, and highlights your rows

**Games (2 browser tabs, same room code)**
- [x] Snake: solo run posts a score that appears on the leaderboard
- [x] Word Scramble: 10 rounds, speed bonus, final standings
- [x] Trivia Battle: 10 questions, per-question reveal, podium
- [x] Tic Tac Toe: win detection and rematch with X/O swap
- [x] UNO: draw, play, wild colour picker, UNO! call, winner
- [x] Flappy Race: both birds fly the same course, crash → spectate, ranked result
- [x] Chess: legal-move dots, illegal move rejected, checkmate result, rematch colour swap
- [x] Emoji Guessing: composer → clue broadcast → wrong and correct guesses → reveal, five rounds

**Multiplayer plumbing**
- [x] Chat messages arrive in both tabs, with join/leave system notices
- [x] Player profile shows the games just played
- [x] Responsive layout verified down to 360px

> Deployed builds were smoke-tested from a clean clone of the repo: `npm ci` in `server/` and `client/`, `npm run build` in `client/`, then `node server/src/index.js` serving the SPA, REST API and Socket.IO on one port, with `test-chess.mjs` (44 assertions) and `test-emoji.mjs` (five full rounds) passing against that server.

### Free-tier notes (Render)
- Free web services sleep after ~15 minutes of inactivity; the first request afterwards takes ~30 s to wake. Sockets reconnect on their own once the instance is up.
- No persistent disk is needed — all game state lives in memory and scores are persisted to Supabase.
- Supabase keys are optional: without them the server keeps scores in memory and every feature still works.
