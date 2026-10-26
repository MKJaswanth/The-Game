import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import { SERVER_URL } from '../socket/socket.js';

const GAME_LABELS = {
  snake: 'Snake',
  trivia: 'Trivia',
  wordscramble: 'Word Scramble',
  tictactoe: 'Tic Tac Toe',
  uno: 'UNO',
  flappy: 'Flappy Race',
  chess: 'Chess',
  emoji: 'Emoji Guessing',
  drawing: 'Draw & Guess',
  ludo: 'Ludo'
};

function formatGameType(t) {
  return GAME_LABELS[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Unknown');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso || '';
  }
}

export default function Profile() {
  const { nickname: routeNick } = useParams();
  const { nickname: myNick } = usePlayer();
  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const nick = decodeURIComponent(routeNick || '');

    async function load() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const [statsRes, histRes] = await Promise.all([
          fetch(`${SERVER_URL}/api/players/${encodeURIComponent(nick)}`),
          fetch(`${SERVER_URL}/api/players/${encodeURIComponent(nick)}/history`)
        ]);
        if (cancelled) return;

        if (statsRes.status === 404 || !statsRes.ok) {
          const hist404 = statsRes.status === 404;
          if (hist404) { setNotFound(true); setLoading(false); return; }
        }
        const statsData = await statsRes.json();
        const histData = await histRes.json().catch(() => ({ history: [] }));

        if (!statsData.success) {
          if ((statsData.error || '').includes('not found')) setNotFound(true);
          else setError(statsData.error || 'Failed to load profile');
        } else {
          setPlayer(statsData.player);
        }
        setHistory(histData.history || []);
      } catch {
        if (!cancelled) setError('Could not reach the server. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [routeNick]);

  if (loading) {
    return (
      <div className="page">
        <div className="container prof-wrap">
          <div className="prof-card">
            <div className="prof-skel-avatar" />
            <div className="prof-skel-line" style={{ width: 180 }} />
            <div className="prof-skel-row">
              <div className="prof-skel-line" style={{ width: 100 }} />
              <div className="prof-skel-line" style={{ width: 100 }} />
              <div className="prof-skel-line" style={{ width: 100 }} />
            </div>
            <div className="prof-skel-line" style={{ width: '100%' }} />
            <div className="prof-skel-line" style={{ width: '92%' }} />
            <div className="prof-skel-line" style={{ width: '84%' }} />
          </div>
        </div>
        <style>{`
          .prof-skel-avatar { width: 64px; height: 64px; border-radius: var(--r-md); }
          .prof-skel-line { height: 18px; border-radius: var(--r-sm); }
          .prof-skel-row { display: flex; gap: var(--s6); }
          .prof-skel-avatar, .prof-skel-line {
            background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%);
            background-size: 200% 100%;
            animation: profShimmer 1.4s infinite;
          }
          .prof-card { display: flex; flex-direction: column; gap: var(--s5); padding: var(--s10) var(--s8); }
          @keyframes profShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 520 }}>
          <div className="card" style={{ padding: 'var(--s10) var(--s8)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--s4)', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-3xl)', color: 'var(--text-3)' }}>404</span>
            <h2 style={{ fontSize: 'var(--t-xl)' }}>No profile for "{decodeURIComponent(routeNick || '')}"</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 'var(--t-sm)' }}>
              This player hasn't finished any games yet. Play a match and the profile will appear.
            </p>
            <Link to="/hub" className="btn btn-primary">Back to Hub</Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 520 }}>
          <div className="card" style={{ padding: 'var(--s10) var(--s8)', textAlign: 'center' }}>
            <p style={{ color: 'var(--red)', fontWeight: 700 }}>{error}</p>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--s4)' }} onClick={() => location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMe = myNick && player.nickname.toLowerCase() === myNick.toLowerCase();
  const winRate = player.gamesPlayed > 0 ? Math.round((player.totalWins / player.gamesPlayed) * 100) : 0;

  return (
    <div className="page">
      <div className="container prof-wrap">

        {/* Identity header */}
        <div className="prof-card">
          <div className="prof-id">
            <Avatar nickname={player.nickname} size="lg" />
            <div className="prof-id-text">
              <div className="prof-id-name">
                {player.nickname}
                {isMe && <Badge variant="accent">You</Badge>}
              </div>
              <div className="prof-id-sub">Player profile</div>
            </div>
            <span className="prof-source mono">{player.source === 'supabase' ? 'CLOUD DATA' : 'LOCAL DATA'}</span>
          </div>

          {/* Stats row */}
          <div className="prof-stats">
            <div className="prof-stat">
              <span className="prof-stat-label">GAMES PLAYED</span>
              <span className="prof-stat-val">{player.gamesPlayed}</span>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">TOTAL WINS</span>
              <span className="prof-stat-val" style={{ color: player.totalWins > 0 ? 'var(--green)' : 'var(--text-2)' }}>{player.totalWins}</span>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">WIN RATE</span>
              <span className="prof-stat-val mono">{winRate}%</span>
            </div>
            <div className="prof-stat">
              <span className="prof-stat-label">TOTAL SCORE</span>
              <span className="prof-stat-val" style={{ color: 'var(--accent-hi)' }}>{player.totalScore}</span>
            </div>
          </div>

          {/* Best scores per game */}
          <div className="prof-bests">
            <span className="prof-bests-title">BEST SCORES</span>
            <div className="prof-bests-grid">
              {player.bestScores.length === 0 && (
                <span style={{ color: 'var(--text-3)', fontSize: 'var(--t-sm)' }}>No best scores yet</span>
              )}
              {player.bestScores.map((b) => (
                <div key={b.gameType} className="prof-best">
                  <span className="prof-best-game">{formatGameType(b.gameType)}</span>
                  <span className="prof-best-val mono">{b.bestScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="prof-card">
          <div className="prof-hist-head">
            <h3 className="prof-hist-title">GAME HISTORY</h3>
            <span style={{ fontSize: 'var(--t-xs)', color: 'var(--text-3)' }}>Last {history.length} {history.length === 1 ? 'game' : 'games'}</span>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: 'var(--s8) 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-2)', marginBottom: 'var(--s4)' }}>No games played yet — be the first!</p>
              <Link to="/hub" className="btn btn-primary">Play a game</Link>
            </div>
          ) : (
            <table className="prof-hist-table">
              <thead>
                <tr>
                  <th>GAME</th>
                  <th>SCORE</th>
                  <th>RESULT</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {history.map((g) => (
                  <tr key={g.id || `${g.gameType}-${g.playedAt}`} className={g.won ? 'prof-row-won' : ''}>
                    <td>{formatGameType(g.gameType)}</td>
                    <td className="mono" style={{ color: 'var(--accent-hi)', fontWeight: 700 }}>{g.score}</td>
                    <td>
                      {g.won ? (
                        <Badge variant="success">Won</Badge>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                    <td className="mono prof-date">{formatDate(g.playedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to="/leaderboard" className="btn btn-ghost">View Leaderboard →</Link>
        </div>
      </div>

      <style>{`
        .prof-wrap {
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: var(--s5);
        }
        .prof-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          padding: var(--s6);
          display: flex;
          flex-direction: column;
          gap: var(--s5);
        }
        .prof-id { display: flex; align-items: center; gap: var(--s4); min-width: 0; }
        .prof-id-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .prof-id-name {
          display: flex; align-items: center; gap: var(--s3);
          font-size: var(--t-3xl); font-weight: 800; color: var(--text);
          letter-spacing: -0.01em; min-width: 0; overflow: hidden;
        }
        .prof-id-name > :first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .prof-id-sub { color: var(--text-3); font-size: var(--t-xs); text-transform: uppercase; letter-spacing: 0.1em; font-family: var(--mono); }
        .prof-source { margin-left: auto; font-size: 10px; color: var(--text-3); border: 1px solid var(--border); border-radius: var(--r-pill); padding: 3px 9px; }
        .prof-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: var(--s3);
        }
        .prof-stat {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: var(--s4);
          display: flex; flex-direction: column; gap: 4px;
        }
        .prof-stat-label {
          font-family: var(--mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; color: var(--text-3);
        }
        .prof-stat-val { font-size: var(--t-2xl); font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }
        .prof-bests { display: flex; flex-direction: column; gap: var(--s3); }
        .prof-bests-title {
          font-family: var(--mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; color: var(--text-3);
        }
        .prof-bests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--s3); }
        .prof-best {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-2); border: 1px solid var(--border);
          border-radius: var(--r-md); padding: var(--s3) var(--s4);
        }
        .prof-best-game { font-weight: 600; font-size: var(--t-sm); color: var(--text-2); }
        .prof-best-val { font-weight: 800; color: var(--accent-hi); font-size: var(--t-lg); }
        .prof-hist-head { display: flex; align-items: center; justify-content: space-between; }
        .prof-hist-title {
          font-family: var(--mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; color: var(--text-3); margin: 0;
        }
        .prof-hist-table { width: 100%; border-collapse: collapse; }
        .prof-hist-table th {
          text-align: left; padding: var(--s2) var(--s3);
          font-family: var(--mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; color: var(--text-3);
          border-bottom: 1px solid var(--border);
        }
        .prof-hist-table td {
          padding: var(--s3);
          border-bottom: 1px solid var(--border);
          font-size: var(--t-sm); color: var(--text);
        }
        .prof-row-won td:first-child { color: var(--green); font-weight: 600; }
        .prof-date { font-size: var(--t-xs); color: var(--text-3); white-space: nowrap; }

        @media (max-width: 640px) {
          .prof-stats { grid-template-columns: 1fr 1fr; }
          .prof-source { display: none; }
          .prof-card { padding: var(--s5) var(--s4); min-width: 0; }
          .prof-id-name { font-size: var(--t-2xl); }
          .prof-hist-table { display: block; overflow-x: auto; white-space: nowrap; }
          .prof-hist-table thead, .prof-hist-table tbody { display: table; width: 100%; min-width: 470px; }
        }
      `}</style>
    </div>
  );
}
