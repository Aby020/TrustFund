import {
  useEffect,
  useId,
  useRef,
  type DialogHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '@/utils/cx';
import { IconButton } from '../icon-button/icon-button';
import { Button } from '../button/button';
import './dialog.css';

export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'onClose' | 'title'> {
  /** Controlled open state. */
  open: boolean;
  /** Called when the dialog requests to close (Esc, backdrop, close button). */
  onClose: () => void;
  title: ReactNode;
  /** Short supplementary text under the title. */
  description?: ReactNode;
  /** Footer actions (render <Button>s). Left-empty for a close-only dialog. */
  footer?: ReactNode;
  /** Render a close (×) button in the header. Default true. */
  dismissible?: boolean;
  /** Larger surface variant. */
  size?: 'md' | 'lg';
  children?: ReactNode;
}

/**
 * Dialog — modal built on the native <dialog>. `showModal()` gives us top-layer
 * rendering, focus trapping, an inert page, and Esc-to-close for free. The
 * controls mount only while open.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  dismissible = true,
  size = 'md',
  children,
  className,
  ...rest
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Remember what had focus so we can restore it on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  // Drive the native dialog open/close. jsdom doesn't implement showModal(),
  // so fall back to the `open` attribute in test/unsupported environments.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      // Bring focus into the dialog for SR + keyboard users.
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    } else if (dialog.hasAttribute('open') || dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      triggerRef.current?.focus();
    }
  }, [open]);

  // Esc triggers a native "cancel" event; route it to onClose.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cx('dialog', size === 'lg' && 'dialog--lg', className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      {...rest}
    >
      <div className="dialog__header">
        <div>
          <div className="dialog__title" id={titleId}>
            {title}
          </div>
          {description && (
            <div className="dialog__description" id={descriptionId}>
              {description}
            </div>
          )}
        </div>
        {dismissible && (
          <IconButton
            className="dialog__close"
            aria-label="Close dialog"
            size="sm"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
        )}
      </div>

      {children && <div className="dialog__body">{children}</div>}

      {footer && (
        <div className="dialog__footer">
          {footer}
          {dismissible && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      )}
    </dialog>
  );
}