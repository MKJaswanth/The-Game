/* eslint-disable react-refresh/only-export-components, react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import socket from '../socket/socket.js';
import { validateNickname } from '../utils/validation.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [nickname, setNickname] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('player_nickname') || null : null;
  });
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    // Listen for lobby updates from server
    function handleLobbyUpdate(data) {
      if (Array.isArray(data)) {
        setOnlinePlayers(data);
      } else if (data && Array.isArray(data.players)) {
        setOnlinePlayers(data.players);
      }
    }

    socket.on('lobby:update', handleLobbyUpdate);

    // If already stored nickname exists, re-sync with socket on connect/reconnect
    function syncPlayer() {
      const stored = localStorage.getItem('player_nickname');
      if (stored) {
        socket.emit('player:join', { nickname: stored }, (res) => {
          if (res && res.success) {
            setNickname(stored);
          }
        });
      }
    }

    if (socket.connected) {
      syncPlayer();
    }
    socket.on('connect', syncPlayer);

    return () => {
      socket.off('lobby:update', handleLobbyUpdate);
      socket.off('connect', syncPlayer);
    };
  }, []);

  const joinHub = (rawNickname) => {
    return new Promise((resolve, reject) => {
      const validation = validateNickname(rawNickname);
      if (!validation.valid) {
        setJoinError(validation.error);
        return reject(new Error(validation.error));
      }

      setIsJoining(true);
      setJoinError(null);

      // Ensure socket is connected
      if (!socket.connected) {
        socket.connect();
      }

      // The acknowledgement and the timeout race each other, so whichever gets
      // there first claims the join. Reading `isJoining` in the timeout would
      // see the value from the render that created this closure (always false),
      // which left the button spinning on "Entering…" forever when the server
      // never answered.
      let settled = false;

      // Emit player:join with acknowledgment callback
      socket.emit('player:join', { nickname: validation.value }, (response) => {
        if (settled) return;
        settled = true;
        setIsJoining(false);
        if (response && response.success) {
          setNickname(validation.value);
          localStorage.setItem('player_nickname', validation.value);
          resolve(validation.value);
        } else {
          const errMessage = response?.error || 'This nickname is already in use. Try another!';
          setJoinError(errMessage);
          reject(new Error(errMessage));
        }
      });

      // 5-second timeout safeguard
      setTimeout(() => {
        if (settled) return;
        settled = true;
        setIsJoining(false);
        const timeoutErr = 'Connection timed out. Please try again.';
        setJoinError(timeoutErr);
        reject(new Error(timeoutErr));
      }, 5000);
    });
  };

  const leaveHub = () => {
    if (nickname) {
      socket.emit('player:leave', { nickname });
    }
    setNickname(null);
    localStorage.removeItem('player_nickname');
  };

  return (
    <PlayerContext.Provider
      value={{
        nickname,
        setNickname,
        onlinePlayers,
        isJoining,
        joinError,
        setJoinError,
        joinHub,
        leaveHub,
        socket
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
