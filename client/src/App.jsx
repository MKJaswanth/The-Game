import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext.jsx';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import GameHub from './pages/GameHub.jsx';
import Room from './pages/Room.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css';

export default function App() {
  return (
    <PlayerProvider>
      <BrowserRouter>
        <div className="app-root">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/hub" element={<GameHub />} />
              <Route path="/room/:code" element={<Room />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile/:nickname" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </PlayerProvider>
  );
}
