/**
 * cx — tiny className combiner (named "cx" to match common design-system
 * convention). No dependency: you shouldn't pull clsx for this.
 *
 * ```ts
 * cx('button', isActive && 'button--active', tone === 'danger' && 'button--danger')
 * ```
 */
export type CxValue = string | number | false | null | undefined;

export function cx(...values: CxValue[]): string {
  return values.filter(Boolean).join(' ');
}