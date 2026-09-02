import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MotionReveal } from './motion-reveal';

/**
 * Mock matchMedia for useReducedMotion (jsdom does not implement it).
 * Returns matches: false by default; tests can override.
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

describe('MotionReveal', () => {
  it('renders children', () => {
    render(
      <MotionReveal>
        <span>Hello</span>
      </MotionReveal>,
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('applies a custom className', () => {
    render(
      <MotionReveal className="my-class">
        <span>Content</span>
      </MotionReveal>,
    );
    const wrapper = screen.getByText('Content').closest('div');
    expect(wrapper?.className).toContain('my-class');
  });

  it('forwards data-testid to the wrapper element', () => {
    render(
      <MotionReveal data-testid="reveal-el">
        <span>Content</span>
      </MotionReveal>,
    );
    expect(screen.getByTestId('reveal-el')).toBeDefined();
  });

  it('accepts a custom variant', () => {
    const customVariant = {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    };
    render(
      <MotionReveal variant={customVariant} data-testid="custom">
        <span>Content</span>
      </MotionReveal>,
    );
    expect(screen.getByTestId('custom')).toBeDefined();
  });

  it('accepts a delay prop', () => {
    render(
      <MotionReveal delay={0.3} data-testid="delayed">
        <span>Content</span>
      </MotionReveal>,
    );
    expect(screen.getByTestId('delayed')).toBeDefined();
  });
});
