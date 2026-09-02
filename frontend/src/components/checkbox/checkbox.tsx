import {
  forwardRef,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from '@/utils/cx';
import './checkbox.css';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text rendered next to the box. */
  label: ReactNode;
  /** Show an indeterminate ("mixed") visual state. */
  indeterminate?: boolean;
}

/** Checkbox — accessible checkbox with a custom-box visual. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, indeterminate = false, id, className, checked, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const combinedRef: Ref<HTMLInputElement> = (node) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);

  return (
    <label htmlFor={id} className={cx('checkbox', className)}>
      <input
        ref={combinedRef}
        id={id}
        type="checkbox"
        className="checkbox__input"
        checked={checked}
        {...rest}
      />
      <span
        className={cx(
          'checkbox__box',
          checked && !indeterminate && 'checkbox__box--checked',
          indeterminate && !checked && 'checkbox__box--checked',
        )}
        aria-hidden="true"
      >
        <svg className="checkbox__check" viewBox="0 0 12 12" width="12" height="12">
          {indeterminate && !checked ? (
            <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <path
              d="M2.5 6.2 5 8.7l4.5-5.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </span>
      {label && <span className="checkbox__label">{label}</span>}
    </label>
  );
});