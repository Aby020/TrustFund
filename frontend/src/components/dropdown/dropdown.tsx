import {
  createContext,
  useContext,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '@/utils/cx';
import { useClickOutside, useDisclosure } from '@/hooks';
import { Button, type ButtonVariant } from '../button/button';
import './dropdown.css';

/* --- Context: lets Dropdown own all menu-item refs for roving focus ----- */
interface DropdownContextValue {
  registerItem: (ref: HTMLButtonElement) => void;
  focusIndex: (index: number) => void;
  itemCount: number;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext(): DropdownContextValue {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('Dropdown subcomponents must be inside <Dropdown>.');
  return context;
}

/* --- Dropdown (root) ------------------------------------------------------- */

export interface DropdownProps {
  /** Menu content: compose <DropdownItem> / <DropdownSeparator>. */
  children: ReactNode;
  /** Trigger button label. */
  label: string;
  /** Accessible description for the trigger (defaults to label). */
  triggerLabel?: string;
  /** Style the trigger as. */
  triggerVariant?: ButtonVariant;
  className?: string;
}

/**
 * Dropdown — accessible menu. The trigger is a full keyboard-control button;
 * items use roving focus (↑/↓, Home/End), Esc and click-outside to dismiss.
 */
export function Dropdown({
  children,
  label,
  triggerLabel = label,
  triggerVariant = 'secondary',
  className,
}: DropdownProps) {
  const { isOpen, open, close, toggle } = useDisclosure(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndexRef = useRef(-1);
  const triggerId = useId();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Dismiss when a pointer lands outside the trigger + menu.
  useClickOutside(rootRef, close, isOpen);

  // Rebuild the flat item list from the DOM; menus mount/unmount with each
  // open, so a rebuild on open is always accurate.
  const rebuildItems = () => {
    itemRefs.current = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
  };

  return (
    <DropdownContext.Provider
      value={{
        registerItem: (ref) => itemRefs.current.push(ref),
        close,
        itemCount: itemRefs.current.filter(Boolean).length,
        focusIndex: (target: number) => {
          const enabled = itemRefs.current.filter(Boolean);
          if (enabled.length === 0) return;
          const clamped = (target + enabled.length) % enabled.length;
          enabled[clamped]?.focus();
          focusIndexRef.current = clamped;
        },
      }}
    >
      <div ref={rootRef} className={cx('dropdown', className)}>
        <Button
          variant={triggerVariant}
          onClick={toggle}
          onKeyDown={(event) => {
            if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
              event.preventDefault();
              rebuildItems();
              open();
              requestAnimationFrame(() => {
                const enabled = itemRefs.current.filter(Boolean);
                if (enabled[0]) {
                  enabled[0].focus();
                  focusIndexRef.current = 0;
                }
              });
            }
          }}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={triggerLabel}
          id={triggerId}
          className="dropdown-trigger"
        >
          <span>{label}</span>
          <svg
            className="dropdown-trigger__chevron"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>

        {isOpen && (
          <div className="dropdown-panel" role="presentation">
            <ul
              ref={listRef}
              id={menuId}
              className="dropdown__menu"
              role="menu"
              aria-labelledby={triggerId}
              onKeyDown={(event) => handleMenuKeyDown(event, focusIndexRef, itemRefs, close, triggerId)}
            >
              {children}
            </ul>
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
}

/** Keyboard handling for the open menu (roving focus). */
function handleMenuKeyDown(
  event: KeyboardEvent,
  focusIndexRef: React.MutableRefObject<number>,
  itemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
  close: () => void,
  triggerId: string,
) {
  const move = (target: number) => {
    const enabled = itemRefs.current.filter(Boolean);
    if (enabled.length === 0) return;
    const clamped = (target + enabled.length) % enabled.length;
    enabled[clamped]?.focus();
    focusIndexRef.current = clamped;
  };

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      close();
      document.getElementById(triggerId)?.focus();
      return;
    case 'ArrowDown':
      event.preventDefault();
      move(focusIndexRef.current + 1);
      return;
    case 'ArrowUp':
      event.preventDefault();
      move(focusIndexRef.current - 1);
      return;
    case 'Home':
      event.preventDefault();
      move(0);
      return;
    case 'End':
      event.preventDefault();
      move(itemRefs.current.filter(Boolean).length - 1);
      return;
    case 'Tab':
      close();
  }
}

/* --- DropdownItem ---------------------------------------------------------- */

export interface DropdownItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'type'> {
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Destructive items get the danger treatment. */
  destructive?: boolean;
  children: ReactNode;
}

export function DropdownItem({
  icon,
  destructive = false,
  className,
  children,
  onClick,
  disabled,
  ...rest
}: DropdownItemProps) {
  const { registerItem, close } = useDropdownContext();

  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className={cx(
          'dropdown__item',
          destructive && 'dropdown__item--danger',
          className,
        )}
        disabled={disabled}
        ref={registerItem}
        onClick={(event) => {
          onClick?.(event);
          close();
        }}
        {...rest}
      >
        {icon && <span className="dropdown__item-icon">{icon}</span>}
        {children}
      </button>
    </li>
  );
}

/* --- DropdownSeparator ----------------------------------------------------- */

export function DropdownSeparator() {
  return (
    <li role="separator" className="dropdown__separator" aria-hidden="true" />
  );
}