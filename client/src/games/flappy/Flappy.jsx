import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import socket from '../../socket/socket.js';
import './flappy.css';

/* M12 — Flappy Race 🐦
   The server owns the physics; this component only sends flap impulses and
   renders interpolated 30 Hz snapshots (own bird + rival ghosts). */

// Must mirror server/src/socket/games/flappy.js
const W = 420;
const H = 560;
const GROUND_H = 40;
const BIRD_X = 110;
const BIRD_R = 12;
const GRAVITY = 1450;
const FLAP_VY = -420;
const MAX_FALL_VY = 720;

const BIRD_COLORS = ['#f5c518', '#22d3ee', '#a78bfa', '#34d399'];
const colorFor = (players, nickname) => {
  const i = Math.max(0, players.indexOf(nickname));
  return BIRD_COLORS[i % BIRD_COLORS.length];
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function stepPredictedBird(bird, now) {
  if (!bird) return null;
  const dt = clamp((now - bird.at) / 1000, 0, 0.05);
  bird.vy = Math.min(MAX_FALL_VY, bird.vy + GRAVITY * dt);
  bird.y = clamp(bird.y + bird.vy * dt, BIRD_R, H - BIRD_R);
  bird.at = now;
  return bird;
}

/* ---------- canvas painting ---------- */

function drawBackdrop(ctx, worldX) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0f22');
  sky.addColorStop(0.55, '#141033');
  sky.addColorStop(1, '#1b1440');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // parallax starfield / skyline dots
  for (let i = 0; i < 44; i++) {
    const seed = i * 97.31;
    const x = ((seed * 13.7 - worldX * 0.06) % (W + 60) + W + 60) % (W + 60) - 30;
    const y = 24 + ((seed * 7.13) % (H - GROUND_H - 80));
    const r = i % 7 === 0 ? 1.7 : 1;
    ctx.globalAlpha = 0.14 + ((i % 5) * 0.05);
    ctx.fillStyle = '#c7d2fe';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx, speed) {
  const g = ctx.createLinearGradient(0, H - GROUND_H, 0, H);
  g.addColorStop(0, '#241a4d');
  g.addColorStop(1, '#120d2b');
  ctx.fillStyle = g;
  ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - GROUND_H + 1);
  ctx.lineTo(W, H - GROUND_H + 1);
  ctx.stroke();

  // dashes scrolling with the course speed hint
  ctx.fillStyle = 'rgba(167, 139, 250, 0.18)';
  const offset = (performance.now() / 1000) * speed;
  for (let x = -((offset * 0.25) % 40); x < W; x += 40) {
    ctx.fillRect(x, H - GROUND_H + 12, 18, 4);
  }
}

function drawPipePair(ctx, x, gapY, gapH) {
  const body = ctx.createLinearGradient(x, 0, x + 62, 0);
  body.addColorStop(0, '#0f766e');
  body.addColorStop(0.35, '#10b981');
  body.addColorStop(1, '#065f46');

  const capW = 70;
  const capH = 22;
  const left = x;
  const capLeft = x - (capW - 62) / 2;

  const paintBody = (top, height) => {
    if (height <= 0) return;
    ctx.fillStyle = body;
    ctx.fillRect(left, top, 62, height);
    ctx.strokeStyle = 'rgba(4, 47, 46, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top, 60, height);
  };

  const paintCap = (top) => {
    ctx.fillStyle = body;
    ctx.beginPath();
    const r = 8;
    const rr = Math.min(r, capH / 2);
    ctx.moveTo(capLeft + rr, top);
    ctx.arcTo(capLeft + capW, top, capLeft + capW, top + capH, rr);
    ctx.arcTo(capLeft + capW, top + capH, capLeft, top + capH, rr);
    ctx.arcTo(capLeft, top + capH, capLeft, top, rr);
    ctx.arcTo(capLeft, top, capLeft + capW, top, rr);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  paintBody(0, gapY - capH);
  paintCap(gapY - capH);
  paintBody(gapY + gapH + capH, H - GROUND_H - (gapY + gapH + capH));
  paintCap(gapY + gapH);
}

function drawBird(ctx, { x, y, vy, color, alpha = 1, label, score, mine }) {
  const tilt = clamp(vy / 900, -0.5, 0.85);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.shadowColor = mine ? color : 'transparent';
  ctx.shadowBlur = mine ? 18 : 0;

  const body = ctx.createLinearGradient(-BIRD_R, -BIRD_R, BIRD_R, BIRD_R);
  body.addColorStop(0, color);
  body.addColorStop(1, mine ? '#f59e0b' : color);

  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_R + 1, BIRD_R - 1, 0, 0, Math.PI * 2);
  if (mine) {
    ctx.fillStyle = body;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `${color}22`;
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  // eye
  ctx.beginPath();
  ctx.arc(4, -4, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1020';
  ctx.fill();

  // beak
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(18, 3);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fillStyle = '#fb923c';
  ctx.fill();

  // wing
  ctx.beginPath();
  ctx.ellipse(-4, 2, 6, 4, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = mine ? 'rgba(255,255,255,0.55)' : `${color}55`;
  ctx.fill();

  ctx.restore();

  if (label) {
    ctx.save();
    ctx.globalAlpha = mine ? 0.9 : 0.75;
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(`${label}${typeof score === 'number' ? ` · ${score}` : ''}`, x, y - BIRD_R - 10);
    ctx.restore();
  }
}

function snapshotAlpha(a, b, now) {
  if (!a || !b || !b.at || b.at === a.at) return 1;
  return clamp((now - b.at) / (b.at - a.at) + 1, 0, 1);
}

export default function Flappy({ roomCode, onExit }) {
  const { nickname, socket: ctxSocket } = usePlayer();
  const s = ctxSocket || socket;

  const canvasRef = useRef(null);
  const snapA = useRef(null);
  const snapB = useRef(null);
  const [latest, setLatest] = useState(null);
  const [toast, setToast] = useState('');
  const [voteText, setVoteText] = useState('');
  const toastTimer = useRef(null);
  const predictedMine = useRef(null);
  const lastFlapAt = useRef(0);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  /* ---------- socket wiring ---------- */
  useEffect(() => {
    const onState = (snap) => {
      if (!snap || snap.roomCode !== roomCode) return;
      const mine = snap.birds?.find((bird) => bird.nickname === nickname);
      const now = performance.now();
      const prediction = predictedMine.current;

      if (mine) {
        if (!prediction || snap.status !== 'racing' || !mine.alive || !prediction.alive) {
          predictedMine.current = {
            y: mine.y,
            vy: mine.vy || 0,
            at: now,
            alive: mine.alive
          };
        } else {
          // Keep the local flap responsive, then gently reconcile to the
          // authoritative server snapshot instead of snapping backwards on
          // every network update.
          stepPredictedBird(prediction, now);
          const recentFlap = now - lastFlapAt.current < 180;
          prediction.y += (mine.y - prediction.y) * (recentFlap ? 0.16 : 0.34);
          if (!recentFlap) prediction.vy = mine.vy || 0;
          prediction.alive = mine.alive;
          prediction.at = now;
        }
      }

      snapA.current = snapB.current;
      snapB.current = { ...snap, at: now };
      setLatest(snap);
    };

    const onEnd = (payload) => {
      if (payload?.roomCode !== roomCode) return;
      setLatest((prev) => (prev ? { ...prev, status: 'finished', standings: payload.standings, winner: payload.winner } : prev));
    };

    const onClosed = (payload) => {
      if (payload?.roomCode === roomCode) onExit?.();
    };

    s.on('flappy:state', onState);
    s.on('flappy:end', onEnd);
    s.on('flappy:closed', onClosed);

    s.emit('flappy:get', { roomCode }, (res) => {
      if (res && !res.success) showToast(res.error || 'Could not load the race.');
    });

    return () => {
      s.off('flappy:state', onState);
      s.off('flappy:end', onEnd);
      s.off('flappy:closed', onClosed);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [nickname, roomCode, onExit, s, showToast]);

  /* ---------- render loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const cssW = rect.width || W;
      const cssH = (cssW * H) / W;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform((cssW * dpr) / W, 0, 0, (cssH * dpr) / H, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const b = snapB.current;
      const a = snapA.current;
      const now = performance.now();

      ctx.clearRect(0, 0, W, H);

      if (!b) {
        drawBackdrop(ctx, 0);
        drawGround(ctx, 0);
        ctx.fillStyle = 'rgba(199,210,254,0.6)';
        ctx.font = '700 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CONNECTING TO THE COURSE…', W / 2, H / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      const alpha = snapshotAlpha(a, b, now);
      const extraSeconds = b.status === 'racing' ? Math.max(0, now - b.at) / 1000 : 0;
      const worldX = (a ? lerp(a.worldX, b.worldX, alpha) : b.worldX) + extraSeconds * (b.scrollSpeed || 0);
      const players = b.birds.map((x) => x.nickname);
      const myNick = nickname;

      drawBackdrop(ctx, worldX);

      // pipes (matched by id so newly spawned ones pop in cleanly)
      const prevPipes = new Map((a?.pipes || []).map((p) => [p.id, p]));
      for (const p of b.pipes) {
        const prev = prevPipes.get(p.id);
        const x = (prev ? lerp(prev.x, p.x, alpha) : p.x) - extraSeconds * (b.scrollSpeed || 0);
        const gapY = prev ? lerp(prev.gapY, p.gapY, alpha) : p.gapY;
        const gapH = prev ? lerp(prev.gapH, p.gapH, alpha) : p.gapH;
        if (x > W + 40 || x < -100) continue;
        drawPipePair(ctx, x, gapY, gapH);
      }

      drawGround(ctx, b.scrollSpeed || 0);

      // rival ghosts, then my bird on top
      const prevBirds = new Map((a?.birds || []).map((x) => [x.nickname, x]));
      for (const bird of b.birds) {
        if (bird.nickname === myNick) continue;
        const prev = prevBirds.get(bird.nickname);
        const y = clamp(
          (prev ? lerp(prev.y, bird.y, alpha) : bird.y) + extraSeconds * (bird.vy || 0),
          BIRD_R,
          H - BIRD_R
        );
        drawBird(ctx, {
          x: BIRD_X,
          y,
          vy: bird.vy || 0,
          color: colorFor(players, bird.nickname),
          alpha: bird.alive ? 0.85 : 0.28,
          label: bird.alive ? bird.nickname : `${bird.nickname} ✕`,
          score: bird.score,
          mine: false
        });
      }

      const mine = b.birds.find((x) => x.nickname === myNick);
      if (mine) {
        const prev = prevBirds.get(myNick);
        const local = mine.alive && b.status === 'racing'
          ? stepPredictedBird(predictedMine.current, now)
          : null;
        const y = local?.y ?? (prev ? lerp(prev.y, mine.y, alpha) : mine.y);
        const vy = local?.vy ?? mine.vy ?? (prev ? (mine.y - prev.y) / (1 / 30) : 0);
        drawBird(ctx, {
          x: BIRD_X,
          y,
          vy,
          color: colorFor(players, myNick),
          alpha: mine.alive ? 1 : 0.35,
          mine: true
        });

        if (!mine.alive) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(248,113,113,0.95)';
          ctx.font = '800 15px Outfit, sans-serif';
          ctx.fillText('CRASHED — SPECTATING', W / 2, H / 2 - 70);
          ctx.restore();
        }
      }

      // countdown
      if (b.status === 'countdown') {
        const secs = Math.max(1, Math.ceil((b.countdownMs || 0) / 1000));
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(245,197,24,0.95)';
        ctx.font = '800 64px Outfit, sans-serif';
        ctx.fillText(String(secs), W / 2, H / 2 + 18);
        ctx.font = '700 12px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(226,232,240,0.75)';
        ctx.fillText('TAP TO FLAP', W / 2, H / 2 + 44);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [nickname]);

  /* ---------- input ---------- */
  const doFlap = useCallback(() => {
    const st = snapB.current;
    if (!st || st.status !== 'racing') return;
    const me = st.birds.find((x) => x.nickname === nickname);
    if (!me || !me.alive) return;
    const now = performance.now();
    if (!predictedMine.current) {
      predictedMine.current = { y: me.y, vy: me.vy || 0, at: now, alive: true };
    }
    stepPredictedBird(predictedMine.current, now);
    predictedMine.current.vy = FLAP_VY;
    predictedMine.current.at = now;
    lastFlapAt.current = now;
    s.emit('flappy:flap', { roomCode });
  }, [nickname, roomCode, s]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        doFlap();
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [doFlap]);

  const doRematch = () => {
    s.emit('flappy:rematch', { roomCode }, (res) => {
      if (res && !res.success) showToast(res.error || 'Could not restart the race.');
      else if (res?.waiting) setVoteText(`Waiting for ${res.needed - res.votes} more racer(s)…`);
      else setVoteText('');
    });
  };

  /* ---------- final screen (M12-09) ---------- */
  const finished = latest?.status === 'finished';
  const standings = latest?.standings || [];

  if (finished) {
    return (
      <div className="fl-wrap">
        <div className="fl-final">
          <div className="fl-final-trophy">🏆</div>
          <h2 className="fl-final-title">{latest.winner || 'Nobody'} wins the race!</h2>
          <div className="fl-standing-head mono">RACE RESULTS</div>
          <div className="fl-standings">
            {standings.map((st, i) => (
              <div
                key={st.nickname}
                className={`fl-standing ${st.isWinner ? 'is-winner' : ''} ${st.nickname === nickname ? 'is-me' : ''}`}
              >
                <span className="fl-rank mono">#{i + 1}</span>
                <Avatar nickname={st.nickname} size="sm" />
                <span className="fl-standing-name">{st.nickname}</span>
                {st.isWinner && <span className="fl-crown">👑</span>}
                <span className="fl-standing-score mono">{st.score} pipes</span>
              </div>
            ))}
          </div>
          <div className="fl-final-actions">
            <button type="button" className="btn btn-primary" onClick={doRematch}>Race Again</button>
            <button type="button" className="btn btn-ghost" onClick={onExit}>Back to Lobby</button>
          </div>
          {voteText && <div className="fl-vote mono">{voteText}</div>}
        </div>
        {toast && <div className="fl-toast">{toast}</div>}
      </div>
    );
  }

  const myBird = latest?.birds?.find((b) => b.nickname === nickname);

  return (
    <div className="fl-wrap">
      <div className="fl-hud">
        {(latest?.birds || []).map((b) => (
          <div
            key={b.nickname}
            className={`fl-chip ${b.nickname === nickname ? 'is-me' : ''} ${b.alive ? '' : 'is-out'}`}
            style={{ '--chip-color': colorFor((latest?.birds || []).map((x) => x.nickname), b.nickname) }}
          >
            <span className="fl-chip-dot" />
            <span className="fl-chip-name">{b.nickname}</span>
            <span className="fl-chip-score mono">{b.score}</span>
          </div>
        ))}
      </div>

      <div className="fl-stage">
        <canvas
          ref={canvasRef}
          className="fl-canvas"
          onPointerDown={(e) => { e.preventDefault(); doFlap(); }}
          aria-label="Flappy Race course — tap or press space to flap"
        />
        {myBird && !myBird.alive && (
          <div className="fl-dead-banner mono">SPECTATING · {myBird.score} PIPES</div>
        )}
      </div>

      <div className="fl-controls">
        <button type="button" className="btn btn-primary fl-flap-btn" onClick={doFlap}>
          FLAP <span className="fl-key">Space</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={onExit}>Leave Race</button>
      </div>

      {toast && <div className="fl-toast">{toast}</div>}
    </div>
  );
}
