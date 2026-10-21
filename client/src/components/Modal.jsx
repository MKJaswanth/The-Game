import React, { useEffect } from 'react';

export default function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer = null
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h3 className="modal-header-title">{title}</h3>}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              ×
            </button>
          )}
        </div>
        <div className="modal-body-wrap" style={{ marginBottom: footer ? 'var(--s6)' : '0' }}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--s4);
          border-bottom: 1px solid var(--border);
          padding-bottom: var(--s3);
        }
        .modal-header-title {
          font-size: var(--t-xl);
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .modal-close-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--r-md);
          background: transparent;
          border: 1px solid var(--border-2);
          color: var(--text-2);
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
        }
        .modal-close-btn:hover {
          background: var(--red-dim);
          border-color: var(--red);
          color: var(--red);
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--s3);
          border-top: 1px solid var(--border);
          padding-top: var(--s4);
        }
      `}</style>
    </div>
  );
}
