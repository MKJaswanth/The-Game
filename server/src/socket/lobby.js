import { supabase, isSupabaseConfigured } from '../db/supabase.js';

// Map of socket.id -> { socketId, nickname, joinedAt, status }
const activePlayers = new Map();

/**
 * Validates nickname: 3–20 alphanumeric chars
 */
export function validateNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return { valid: false, error: 'Nickname is required' };
  }
  const trimmed = nickname.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Nickname must be at least 3 characters' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Nickname must be 20 characters or fewer' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Nickname must contain letters and numbers only' };
  }
  return { valid: true, error: null, value: trimmed };
}

export function getActivePlayersList() {
  return Array.from(activePlayers.values()).map(p => ({
    nickname: p.nickname,
    joinedAt: p.joinedAt,
    status: p.status || 'lobby'
  }));
}

export function registerLobbyHandlers(io, socket) {
  // Send current lobby state upon connection
  socket.emit('lobby:update', {
    players: getActivePlayersList(),
    count: activePlayers.size
  });

  // Handle player:join (US-001)
  socket.on('player:join', async ({ nickname }, callback) => {
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      const errRes = { success: false, error: validation.error };
      if (typeof callback === 'function') callback(errRes);
      socket.emit('player:join_error', errRes);
      return;
    }

    const cleanNick = validation.value;
    const lowerNick = cleanNick.toLowerCase();

    // Check if nickname is taken by another socket
    for (const [id, player] of activePlayers.entries()) {
      if (id !== socket.id && player.nickname.toLowerCase() === lowerNick) {
        const dupRes = {
          success: false,
          error: 'This nickname is already in use. Try another!'
        };
        if (typeof callback === 'function') callback(dupRes);
        socket.emit('player:join_error', dupRes);
        console.log(`[Lobby] Rejected duplicate nickname: ${cleanNick} from socket ${socket.id}`);
        return;
      }
    }

    // Add or update player in active map
    activePlayers.set(socket.id, {
      socketId: socket.id,
      nickname: cleanNick,
      joinedAt: new Date().toISOString(),
      status: 'lobby'
    });

    console.log(`[Lobby] Player joined: ${cleanNick} (${socket.id}). Online total: ${activePlayers.size}`);

    const successRes = {
      success: true,
      nickname: cleanNick
    };

    if (typeof callback === 'function') callback(successRes);
    socket.emit('player:joined', successRes);

    // Broadcast updated lobby to all clients (US-001 AC7)
    io.emit('lobby:update', {
      players: getActivePlayersList(),
      count: activePlayers.size
    });

    // Optionally register / upsert in Supabase players table (AUTH-06)
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('players')
          .upsert({ nickname: cleanNick }, { onConflict: 'nickname', ignoreDuplicates: true });
      } catch (dbErr) {
        console.warn(`[DB] Supabase player registration notice: ${dbErr.message}`);
      }
    }
  });

  // Handle player:leave
  socket.on('player:leave', (data, callback) => {
    const existing = activePlayers.get(socket.id);
    if (existing) {
      activePlayers.delete(socket.id);
      console.log(`[Lobby] Player left: ${existing.nickname} (${socket.id}). Online total: ${activePlayers.size}`);
      io.emit('lobby:update', {
        players: getActivePlayersList(),
        count: activePlayers.size
      });
    }
    if (typeof callback === 'function') callback({ success: true });
  });

  // Handle socket disconnect (US-003 / M1-10)
  socket.on('disconnect', (reason) => {
    const existing = activePlayers.get(socket.id);
    if (existing) {
      activePlayers.delete(socket.id);
      console.log(`[Lobby] Player disconnected: ${existing.nickname} (${socket.id}) - Reason: ${reason}. Online: ${activePlayers.size}`);
      io.emit('lobby:update', {
        players: getActivePlayersList(),
        count: activePlayers.size
      });
    }
  });
}
