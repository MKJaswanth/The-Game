import React from 'react';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  return (
    <div className="page page-leaderboard">
      <div className="container">
        <header className="page-header">
          <h1>Leaderboard</h1>
          <p className="page-desc">All-time rankings and top team scores.</p>
        </header>

        <div className="placeholder-box">
          <p>Global Leaderboard Placeholder (M0 Scaffold)</p>
          <div className="button-group">
            <Link to="/hub" className="btn btn-primary">Back to Hub</Link>
            <Link to="/" className="btn btn-secondary">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
