import React, { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from './Avatar.jsx';

const MAX_CHARS = 200;

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

export default function ChatPanel({ socket, roomCode, currentNick, isVisible }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sendError, setSendError] = useState('');
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Fetch history on mount
  useEffect(() => {
    if (!socket || !roomCode) return;
    socket.emit('chat:history', { roomCode }, (res) => {
      if (res?.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    });
  }, [socket, roomCode]);

  // Listen for incoming messages (M9-02)
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setMessages((prev) => {
        // deduplicate by id
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket]);

  // Auto-scroll to latest (M9-04)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    if (text.length > MAX_CHARS) {
      setSendError(`Max ${MAX_CHARS} characters`);
      return;
    }
    setSendError('');

    socket.emit('chat:message', { roomCode, message: text }, (res) => {
      if (!res?.success) {
        setSendError(res?.error || 'Failed to send');
      }
    });

    setInput(''); // M9-06: clear after send
    inputRef.current?.focus();
  }, [input, socket, roomCode]);

  // M9-06: Enter key submits
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const charsLeft = MAX_CHARS - input.length;
  const isNearLimit = charsLeft <= 30;

  if (!isVisible) return null; // M9-08: hidden during gameplay

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <span className="chat-title">Room Chat</span>
        <span className="chat-count">{messages.length}</span>
      </div>

      {/* Messages (M9-03) */}
      <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Say something!</div>
        )}

        {messages.map((msg) => (
          msg.type === 'system' ? (
            <div key={msg.id} className="chat-msg chat-msg--system">
              <span>{msg.text}</span>
              <span className="chat-time">{formatTime(msg.timestamp)}</span>
            </div>
          ) : (
            <div
              key={msg.id}
              className={`chat-msg chat-msg--user ${msg.nickname === currentNick ? 'chat-msg--mine' : ''}`}
            >
              <div className="chat-msg-avatar">
                <Avatar nickname={msg.nickname} size="sm" />
              </div>
              <div className="chat-msg-body">
                <div className="chat-msg-meta">
                  <span className="chat-msg-nick">
                    {msg.nickname === currentNick ? 'You' : msg.nickname}
                  </span>
                  <span className="chat-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chat-msg-text">{msg.text}</div>
              </div>
            </div>
          )
        ))}

        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input (M9-06, M9-07) */}
      <div className="chat-input-area">
        {sendError && <p className="chat-send-err">{sendError}</p>}
        <div className="chat-input-row">
          <input
            ref={inputRef}
            type="text"
            className="input-field chat-input"
            placeholder="Message..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value.slice(0, MAX_CHARS)); // hard cap at 200
              setSendError('');
            }}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS}
            autoComplete="off"
            aria-label="Chat message input"
          />
          <button
            type="button"
            className="btn btn-primary chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
        {isNearLimit && (
          <p className="chat-char-count" style={{ color: charsLeft <= 10 ? 'var(--red)' : 'var(--text-3)' }}>
            {charsLeft} left
          </p>
        )}
      </div>

      <style>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-xl);
          overflow: hidden;
          height: 100%;
          min-height: 0;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--s3) var(--s4);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .chat-title {
          font-size: var(--t-sm);
          font-weight: 700;
          color: var(--text);
        }

        .chat-count {
          font-size: var(--t-xs);
          font-weight: 600;
          color: var(--text-3);
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-pill);
          padding: 1px 7px;
          min-width: 22px;
          text-align: center;
        }

        /* Messages list */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--s3) var(--s4);
          display: flex;
          flex-direction: column;
          gap: var(--s3);
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: var(--surface-3) transparent;
        }

        .chat-empty {
          font-size: var(--t-xs);
          color: var(--text-3);
          text-align: center;
          padding: var(--s8) 0;
        }

        /* System messages */
        .chat-msg--system {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--s2);
          font-size: var(--t-xs);
          color: var(--text-3);
          text-align: center;
          padding: var(--s1) 0;
        }

        .chat-time {
          font-size: 10px;
          color: var(--text-3);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* User messages */
        .chat-msg--user {
          display: flex;
          align-items: flex-start;
          gap: var(--s2);
          animation: slideIn 180ms var(--ease-spring) both;
        }

        .chat-msg-avatar {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .chat-msg-body {
          flex: 1;
          min-width: 0;
        }

        .chat-msg-meta {
          display: flex;
          align-items: baseline;
          gap: var(--s2);
          margin-bottom: 2px;
        }

        .chat-msg-nick {
          font-size: var(--t-xs);
          font-weight: 700;
          color: var(--text-2);
        }

        .chat-msg--mine .chat-msg-nick {
          color: var(--indigo-hi, #818cf8);
        }

        .chat-msg-text {
          font-size: var(--t-sm);
          color: var(--text);
          line-height: 1.45;
          word-break: break-word;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-sm) var(--r-lg) var(--r-lg) var(--r-lg);
          padding: var(--s2) var(--s3);
          display: inline-block;
          max-width: 100%;
        }

        .chat-msg--mine .chat-msg-text {
          background: var(--indigo-dim, rgba(99, 102, 241, 0.12));
          border-color: rgba(99, 102, 241, 0.2);
        }

        /* Input area */
        .chat-input-area {
          padding: var(--s3) var(--s4);
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: var(--s1);
        }

        .chat-send-err {
          font-size: var(--t-xs);
          color: var(--red);
        }

        .chat-input-row {
          display: flex;
          gap: var(--s2);
        }

        .chat-input {
          flex: 1;
          padding: 8px 12px;
          font-size: var(--t-sm);
          background: var(--surface-2);
        }

        .chat-send-btn {
          padding: 8px 14px;
          font-size: var(--t-xs);
          font-weight: 700;
          flex-shrink: 0;
        }

        .chat-char-count {
          font-size: 10px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
