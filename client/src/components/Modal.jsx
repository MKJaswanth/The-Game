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
        <div className="modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-surface-border)',
          paddingBottom: 'var(--space-3)'
        }}>
          {title && <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{title}</h3>}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-2xl)',
                lineHeight: 1,
                padding: '4px',
                cursor: 'pointer'
              }}
              aria-label="Close modal"
            >
              &times;
            </button>
          )}
        </div>
        <div className="modal-body" style={{ marginBottom: footer ? 'var(--space-6)' : '0' }}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            borderTop: '1px solid var(--color-surface-border)',
            paddingTop: 'var(--space-4)'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
