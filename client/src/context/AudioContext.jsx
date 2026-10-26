/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { playSfx } from '../utils/sfx.js';

const STORAGE_KEY = 'the_game_sfx_enabled';
const AudioSettingsContext = createContext(null);

function readEnabled() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function AudioProvider({ children }) {
  const [enabled, setEnabled] = useState(readEnabled);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // A blocked storage area should not disable the sound controls.
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((value) => !value), []);
  const play = useCallback((name) => {
    if (enabled) playSfx(name);
  }, [enabled]);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <AudioSettingsContext.Provider value={value}>{children}</AudioSettingsContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioSettingsContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
}
