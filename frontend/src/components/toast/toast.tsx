import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cx } from '@/utils/cx';
import { IconButton } from '../icon-button/icon-button';
import './toast.css';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss in ms. 0 (default) turns auto-dismiss off for errors. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'tone'>> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within <ToastProvider>.');
  return context;
}

const DEFAULT_DURATION = 4_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = ++nextId.current;
      const tone = options.tone ?? 'info';
      const item: ToastItem = { id, title: options.title, description: options.description, tone };

      setToasts((current) => [...current, item]);

      const duration =
        options.duration ?? (tone === 'error' ? 0 : DEFAULT_DURATION);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
    },
    [dismiss],
  );

  const helpers = useMemo<ToastContextValue>(() => {
    const make = (tone: ToastTone) => (title: string, description?: string) =>
      show({ title, description, tone });
    return {
      show,
      success: make('success'),
      error: make('error'),
      info: make('info'),
      warning: make('warning'),
    };
  }, [show]);

  return (
    <ToastContext.Provider value={helpers}>
      {children}

      {/* Live region stays mounted; toasts land inside it. */}
      <div className="toast-viewport" role="region" aria-live="polite">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      className={cx('toast', `toast--${toast.tone}`)}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <span className="toast__icon" aria-hidden="true">
        {toast.tone === 'success' && <TickIcon />}
        {toast.tone === 'error' && <ErrorIcon />}
        {toast.tone === 'warning' && <WarningIcon />}
        {toast.tone === 'info' && <InfoIcon />}
      </span>
      <div className="toast__content">
        <div className="toast__title">{toast.title}</div>
        {toast.description && (
          <div className="toast__description">{toast.description}</div>
        )}
      </div>
      <IconButton
        className="toast__close"
        aria-label="Dismiss notification"
        size="sm"
        onClick={onDismiss}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>
    </div>
  );
}

/* --- Inline icons (kept local; the app has no icon library yet) ------------ */

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  'aria-hidden': true,
} as const;

function TickIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="m4.5 12.5 5 5 10-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v5M12 16.5v.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M12 3 1.8 20.5h20.4L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 16.5v.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 11v5M12 7.75v.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}