'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 5000;
const EXIT_DURATION = 300;
const MAX_TOASTS = 5;

function SingleToast({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    timerRef.current = setTimeout(() => onRemove(toast.id), EXIT_DURATION);
  }, [toast.id, onRemove]);

  useEffect(() => {
    // Trigger enter animation after a micro-task so the initial state renders first
    const enterTimer = setTimeout(() => setVisible(true), 10);
    const autoTimer = setTimeout(dismiss, DURATION);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(autoTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  const borderColor =
    toast.type === 'error'   ? '#e05252' :
    toast.type === 'warning' ? '#d08a30' :
                               '#5b8dd9';

  const iconColor =
    toast.type === 'error'   ? '#e05252' :
    toast.type === 'warning' ? '#d08a30' :
                               '#5b8dd9';

  const Icon = toast.type === 'error' ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-[1px]">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ) : toast.type === 'warning' ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-[1px]">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-[1px]">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="8" />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3.5 py-3 shadow-xl max-w-[360px] w-full transition-all ease-out"
      style={{
        fontFamily: 'Roboto Mono, monospace',
        borderLeftWidth: '3px',
        borderLeftColor: borderColor,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(12px)',
        transitionDuration: visible ? '250ms' : `${EXIT_DURATION}ms`,
      }}
    >
      {Icon}
      <p className="flex-1 text-[11.5px] text-[var(--text-primary)] leading-relaxed min-w-0 break-words">
        {toast.message}
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors leading-none mt-[1px]"
        aria-label="Fechar"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    showError:   (msg) => add(msg, 'error'),
    showWarning: (msg) => add(msg, 'warning'),
    showInfo:    (msg) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isMounted && createPortal(
        <div
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
          aria-live="assertive"
          aria-atomic="false"
        >
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto w-full max-w-[360px]">
              <SingleToast toast={toast} onRemove={remove} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
