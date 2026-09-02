import { cx } from './cx';

describe('cx', () => {
  it('joins truthy string values with a space', () => {
    expect(cx('button', 'button--primary', 'button--md')).toBe('button button--primary button--md');
  });

  it('skips falsy values (false, null, undefined, 0, empty string)', () => {
    expect(cx('a', false, null, undefined, 0, '')).toBe('a');
  });

  it('is the standard conditional pattern for design-system components', () => {
    const loading: boolean = true;
    const active: boolean = false;
    expect(cx('button', loading && 'button--loading', active && 'button--active')).toBe(
      'button button--loading',
    );
  });
});