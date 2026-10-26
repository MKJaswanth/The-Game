import { getRoom } from './rooms.js';

/**
 * Validates chat message text
 * Must be 1 to 200 characters after trimming
 */
export function validateMessage(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Message cannot be empty' };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: 'Message must be 200 characters or fewer' };
  }
  return { valid: true, error: null, text: trimmed };
}

/**
 * Broadcasts a formatted system notification to the room
 */
export function broadcastSystemMessage(io, roomCode, text) {
  if (!roomCode || !text) return;
  const room = getRoom(roomCode);
  if (!room) return;

  const sysMsg = {
    id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'system',
    text,
    timestamp: new Date().toISOString()
  };

  room.messages = room.messages || [];
  room.messages.push(sysMsg);
  // Keep memory bounded to last 100 messages per room
  if (room.messages.length > 100) {
    room.messages.shift();
  }

  io.to(room.code).emit('chat:message', sysMsg);
}

/**
 * Register chat socket handlers
 */
export function registerChatHandlers(io, socket) {
  // Handle chat:message (US-022 / M9-02, M9-06, M9-07)
  socket.on('chat:message', ({ roomCode, message }, callback) => {
    if (!roomCode) {
      const err = { success: false, error: 'Room code is required' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    const code = roomCode.toUpperCase().trim();
    const room = getRoom(code);
    if (!room) {
      const err = { success: false, error: 'Room not found' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    // Verify player is inside this room
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) {
      const err = { success: false, error: 'You are not in this room' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    // Validate message content (1-200 chars)
    const validation = validateMessage(message);
    if (!validation.valid) {
      const err = { success: false, error: validation.error };
      if (typeof callback === 'function') callback(err);
      return;
    }

    const chatMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'user',
      nickname: player.nickname,
      senderSocketId: socket.id,
      text: validation.text,
      timestamp: new Date().toISOString()
    };

    room.messages = room.messages || [];
    room.messages.push(chatMsg);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    // Broadcast to all room members
    io.to(code).emit('chat:message', chatMsg);

    const res = { success: true, message: chatMsg };
    if (typeof callback === 'function') callback(res);
  });

  // Handle chat:history (fetch existing messages on join/refresh)
  socket.on('chat:history', ({ roomCode }, callback) => {
    if (!roomCode) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room code is required' });
      return;
    }
    const room = getRoom(roomCode);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    // Open-room codes are public, so history is for seated players only. A
    // bystander could previously read any listed room's conversation.
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room' });
      return;
    }

    if (typeof callback === 'function') {
      callback({ success: true, messages: room.messages || [] });
    }
  });
}
