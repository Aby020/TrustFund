import '@testing-library/jest-dom/vitest';

/* -----------------------------------------------------------------------
 * Browser API stubs — jsdom does not implement these; components that use
 * them (e.g. useMediaQuery, usePrefersReducedMotion, MotionReveal) need them
 * available at test time.
 * -------------------------------------------------------------------- */

/** Minimal matchMedia stub with addEventListener support. */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

/** IntersectionObserver stub — tests can fire callbacks via the mock. */
if (typeof IntersectionObserver === 'undefined') {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver;
}