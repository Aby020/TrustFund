import { useCallback, useState } from 'react';

/**
 * Allow a component to be controlled (value + onChange) or uncontrolled
 * (internal state). Follows the classic React controlled/uncontrolled pattern.
 */
export function useControllableState<T>(options: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (next: T | ((prev: T) => T)) => void] {
  const { value, defaultValue, onChange } = options;
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue);

  const isControlled = value !== undefined;
  const displayed = isControlled ? value : uncontrolled;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function' ? (next as (prev: T) => T)(displayed) : next;
      if (!isControlled) setUncontrolled(resolved);
      onChange?.(resolved);
    },
    [isControlled, displayed, onChange],
  );

  return [displayed, setValue];
}