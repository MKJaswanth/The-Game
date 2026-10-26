import React, { useEffect, useState } from 'react';
import { getPersonalBests, STORAGE_KEY } from '../utils/personalBests.js';

export default function PersonalBestStrip() {
  const [bests, setBests] = useState(getPersonalBests);

  useEffect(() => {
    const refresh = () => setBests(getPersonalBests());
    window.addEventListener('storage', refresh);
    window.addEventListener('personal-bests:update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('personal-bests:update', refresh);
    };
  }, []);

  return (
    <section className="personal-bests" aria-label="Personal bests">
      <div className="personal-bests-heading">
        <span className="hub-section-kicker">YOUR ARCADE CARD</span>
        <span className="personal-bests-storage mono">LOCAL · {STORAGE_KEY.replace('the_game_', '').replace('_v1', '')}</span>
      </div>
      <div className="personal-bests-grid">
        <div><span className="personal-best-label">WINS</span><strong>{bests.totalWins}</strong></div>
        <div><span className="personal-best-label">SNAKE BEST</span><strong>{bests.bestScores.snake || 0}</strong></div>
        <div><span className="personal-best-label">FLAPPY PIPES</span><strong>{bests.flappyBestPipes || 0}</strong></div>
        <div><span className="personal-best-label">GAMES</span><strong>{bests.gamesPlayed}</strong></div>
      </div>
      <style>{`
        .personal-bests { margin: var(--s5) 0 var(--s6); padding: var(--s4) var(--s5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); }
        .personal-bests-heading { display: flex; justify-content: space-between; align-items: center; gap: var(--s3); margin-bottom: var(--s3); }
        .personal-bests-storage { color: var(--text-3); font-size: 9px; letter-spacing: .08em; }
        .personal-bests-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s3); }
        .personal-bests-grid > div { display: flex; flex-direction: column; gap: 3px; padding: var(--s3); background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--r-md); }
        .personal-best-label { color: var(--text-3); font: 700 9px var(--mono); letter-spacing: .1em; }
        .personal-bests-grid strong { color: var(--accent-hi); font: 800 var(--t-xl) var(--mono); }
        @media (max-width: 560px) { .personal-bests { padding: var(--s3); } .personal-bests-grid { grid-template-columns: repeat(2, 1fr); } .personal-bests-storage { display: none; } }
      `}</style>
    </section>
  );
}
