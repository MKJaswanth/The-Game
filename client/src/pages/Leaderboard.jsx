import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';
import { SERVER_URL } from '../socket/socket.js';
import Avatar from '../components/Avatar.jsx';
import './leaderboard.css';

const TABS = [
  { id: 'all', label: 'All games', title: 'All Games' },
  { id: 'snake', label: 'Snake', title: 'Snake' },
  { id: 'wordscramble', label: 'Word Scramble', title: 'Word Scramble' },
  { id: 'trivia', label: 'Trivia', title: 'Trivia Battle' },
  { id: 'tictactoe', label: 'Tic Tac Toe', title: 'Tic Tac Toe' },
  { id: 'uno', label: 'UNO', title: 'UNO' },
  { id: 'flappy', label: 'Flappy Race', title: 'Flappy Race' },
  { id: 'chess', label: 'Chess', title: 'Chess' },
  { id: 'emoji', label: 'Emoji', title: 'Emoji Guessing' }
];

const GAME_INFO = {
  snake: { title: 'Snake' },
  wordscramble: { title: 'Word Scramble' },
  trivia: { title: 'Trivia Battle' },
  tictactoe: { title: 'Tic Tac Toe' },
  uno: { title: 'UNO' },
  flappy: { title: 'Flappy Race' },
  chess: { title: 'Chess' },
  emoji: { title: 'Emoji Guessing' }
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function RefreshIcon({ spinning }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Leaderboard() {
  const { nickname } = usePlayer();
  const currentNick = nickname || (typeof window !== 'undefined' ? localStorage.getItem('player_nickname') : '');

  const [activeTab, setActiveTab] = useState('all');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLeaderboard = useCallback(async (tabToFetch, isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setError('');

    try {
      const url = tabToFetch === 'all'
        ? `${SERVER_URL}/api/leaderboard`
        : `${SERVER_URL}/api/leaderboard/${tabToFetch}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success) {
        setLeaderboard(data.leaderboard || []);
        setLastUpdated(new Date());
      } else {
        throw new Error(data?.error || 'Failed to fetch leaderboard data');
      }
    } catch (err) {
      console.warn('[Leaderboard] Fetch error:', err.message);
      setError('Unable to load leaderboard. Please check connection and try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setError('');
      try {
        const url = activeTab === 'all'
          ? `${SERVER_URL}/api/leaderboard`
          : `${SERVER_URL}/api/leaderboard/${activeTab}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (active) {
          if (data && data.success) {
            setLeaderboard(data.leaderboard || []);
            setLastUpdated(new Date());
          } else {
            setError(data?.error || 'Failed to fetch leaderboard data');
          }
        }
      } catch (err) {
        if (active) {
          console.warn('[Leaderboard] Fetch error:', err.message);
          setError('Unable to load leaderboard. Please check connection and try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard(activeTab, true);
    }, 60000);

    return () => clearInterval(interval);
  }, [activeTab, fetchLeaderboard]);

  const activeTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="page page-leaderboard">
      <div className="container" style={{ maxWidth: '1000px' }}>
        <header className="leaderboard-header">
          <div>
            <div className="leaderboard-eyebrow">RANKINGS</div>
            <h1 className="leaderboard-title">Global Leaderboard</h1>
            <p className="leaderboard-subtitle">
              {activeTab === 'all'
                ? 'Live top 20 rankings by total points across all games'
                : `Live top 20 rankings for ${activeTabMeta.title}`}
            </p>
          </div>

          <div className="leaderboard-meta-bar">
            {lastUpdated && (
              <span className="leaderboard-timer">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              id="refresh-leaderboard-btn"
              className="leaderboard-refresh-btn"
              onClick={() => fetchLeaderboard(activeTab, true)}
              disabled={loading || isRefreshing}
              aria-label="Refresh Leaderboard"
            >
              <RefreshIcon spinning={isRefreshing} />
              <span>{isRefreshing ? 'Updating…' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Category filter tabs */}
        <nav className="leaderboard-tabs-wrapper" aria-label="Game Filter Tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                className={`leaderboard-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (tab.id !== activeTab) {
                    setLoading(true);
                    setActiveTab(tab.id);
                  }
                }}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Error state */}
        {error && (
          <div className="leaderboard-error">
            <span>{error}</span>
            <button type="button" className="leaderboard-retry" onClick={() => fetchLeaderboard(activeTab)}>
              Retry
            </button>
          </div>
        )}

        <div className="leaderboard-table-card">
          <table className="leaderboard-table" aria-label="Leaderboard Rankings">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th>Player</th>
                <th>{activeTab === 'all' ? 'Activity' : 'Game'}</th>
                <th className="col-num">{activeTab === 'all' ? 'Total Points' : 'Score'}</th>
                <th className="col-date">{activeTab === 'all' ? 'Last Active' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="leaderboard-skeleton-row">
                    <td><div className="skeleton-box skeleton-rank" /></td>
                    <td>
                      <div className="player-cell">
                        <div className="skeleton-box skeleton-avatar" />
                        <div className="skeleton-box skeleton-name" />
                      </div>
                    </td>
                    <td><div className="skeleton-box skeleton-game" /></td>
                    <td><div className="skeleton-box skeleton-score" style={{ marginLeft: 'auto' }} /></td>
                    <td><div className="skeleton-box skeleton-date" style={{ marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="leaderboard-empty-card">
                      <h3 className="leaderboard-empty-title">No scores yet</h3>
                      <p className="leaderboard-empty-desc">
                        {activeTab === 'all'
                          ? 'Play a round from the hub and the first entry will appear here.'
                          : `No scores recorded for ${activeTabMeta.title} yet.`}
                      </p>
                      <Link to="/hub" className="btn btn-primary leaderboard-empty-cta">
                        Back to the hub
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                leaderboard.map((item) => {
                  const isCurrentPlayer = currentNick && item.nickname?.toLowerCase() === currentNick.toLowerCase();
                  const game = GAME_INFO[item.gameType?.toLowerCase()] || { title: item.gameType || 'Game' };
                  const rank = item.rank;

                  return (
                    <tr
                      key={item.id || `${item.nickname}-${item.rank}`}
                      className={`leaderboard-row ${isCurrentPlayer ? 'current-player-row' : ''} ${rank <= 3 ? `top-row top-row--${rank}` : ''}`}
                    >
                      <td className="col-rank-cell">
                        <span className={`rank-num ${rank === 1 ? 'rank-1' : ''}`}>{rank}</span>
                      </td>

                      <td>
                        <Link
                          to={`/profile/${encodeURIComponent(item.nickname)}`}
                          className="player-cell player-link"
                        >
                          <Avatar nickname={item.nickname} size="sm" />
                          <span className="player-nick">
                            {item.nickname}
                            {isCurrentPlayer && <span className="you-pill">you</span>}
                          </span>
                        </Link>
                      </td>

                      <td>
                        <span className="game-name">
                          {activeTab === 'all'
                            ? (item.gamesPlayed ? `${item.gamesPlayed} ${item.gamesPlayed === 1 ? 'match' : 'matches'}` : 'All games')
                            : game.title}
                        </span>
                      </td>

                      <td className="col-num">
                        <span className="score-val">{Number(item.score).toLocaleString()}</span>
                      </td>

                      <td className="col-date col-date-cell">
                        {formatDate(item.playedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
