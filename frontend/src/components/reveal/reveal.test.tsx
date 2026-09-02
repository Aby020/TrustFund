import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Reveal } from './reveal';

/**
 * Mock matchMedia for usePrefersReducedMotion — jsdom does not implement it.
 * Returns matches: false by default; individual tests can override.
 */
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

/**
 * Mock IntersectionObserver — jsdom does not implement it.
 * Captures the callback so tests can fire it manually.
 */
let ioCallback: IntersectionObserverCallback | undefined;

beforeEach(() => {
  ioCallback = undefined;
  window.IntersectionObserver = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
    ioCallback = cb;
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }) as unknown as typeof IntersectionObserver;
});

describe('Reveal', () => {
  it('is hidden by default (not yet in view)', () => {
    render(<Reveal data-testid="el">Content</Reveal>);
    const el = screen.getByTestId('el');
    expect(el).toHaveClass('reveal');
    expect(el).not.toHaveClass('is-visible');
  });

  it('becomes visible when IntersectionObserver fires isIntersecting', () => {
    render(<Reveal data-testid="el">Content</Reveal>);
    const el = screen.getByTestId('el');

    // Simulate the element entering the viewport — wrap in act to flush state
    act(() => {
      ioCallback?.(
        [{ isIntersecting: true, ratio: 1, boundingClientRect: {} as DOMRectReadOnly, intersectionRatio: 1, intersectionRect: {} as DOMRectReadOnly, rootBounds: null, target: document.createElement('div'), time: Date.now() } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(el).toHaveClass('is-visible');
  });

  it('stays hidden if not intersecting', () => {
    render(<Reveal data-testid="el">Content</Reveal>);
    const el = screen.getByTestId('el');

    act(() => {
      ioCallback?.(
        [{ isIntersecting: false, ratio: 0, boundingClientRect: {} as DOMRectReadOnly, intersectionRatio: 0, intersectionRect: {} as DOMRectReadOnly, rootBounds: null, target: document.createElement('div'), time: Date.now() } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(el).not.toHaveClass('is-visible');
  });

  it('is immediately visible when prefers-reduced-motion is active', () => {
    // Override matchMedia to report reduced motion
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<Reveal data-testid="el">Content</Reveal>);
    const el = screen.getByTestId('el');
    expect(el).toHaveClass('is-visible');
  });

  it('applies custom delay as a CSS custom property', () => {
    render(
      <Reveal data-testid="el" delay={200}>
        Content
      </Reveal>,
    );
    const el = screen.getByTestId('el');
    expect(el.style.getPropertyValue('--reveal-delay')).toBe('200ms');
  });

  it('applies custom duration as a CSS custom property', () => {
    render(
      <Reveal data-testid="el" duration={300}>
        Content
      </Reveal>,
    );
    const el = screen.getByTestId('el');
    expect(el.style.getPropertyValue('--reveal-duration')).toBe('300ms');
  });

  it('renders children', () => {
    render(
      <Reveal>
        <span>Hello</span>
      </Reveal>,
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });
});
