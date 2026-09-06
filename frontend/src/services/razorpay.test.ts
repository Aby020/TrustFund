/**
 * Unit tests for the Razorpay Checkout SDK loader.
 *
 * jsdom never executes remote scripts, so tests drive the loader by locating
 * the injected <script> element and dispatching synthetic load/error events
 * on it — the same code path a browser hits when the CDN responds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadRazorpaySdk,
  resetRazorpaySdkState,
  RAZORPAY_CHECKOUT_URL,
  RAZORPAY_SDK_LOAD_TIMEOUT_MS,
} from './razorpay';

const mockCtor = vi.fn() as unknown as typeof window.Razorpay;

/** Locate the script tag the loader injected (it is appended synchronously). */
function injectedScript(): HTMLScriptElement {
  const el = document.getElementById('razorpay-checkout-sdk');
  if (!el) throw new Error('Expected the SDK <script> tag to be injected');
  return el as HTMLScriptElement;
}

/** Count razorpay checkout scripts currently in the DOM. */
function injectedCount(): number {
  return document.querySelectorAll(`script[src="${RAZORPAY_CHECKOUT_URL}"]`).length;
}

describe('loadRazorpaySdk', () => {
  beforeEach(() => {
    resetRazorpaySdkState();
    vi.useRealTimers();
    // Remove any Razorpay global + leftover tags from a previous test.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Razorpay;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    resetRazorpaySdkState();
    vi.restoreAllMocks();
    vi.useRealTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Razorpay;
    document.body.innerHTML = '';
  });

  it('resolves immediately when window.Razorpay is already present', async () => {
    window.Razorpay = mockCtor;

    await expect(loadRazorpaySdk()).resolves.toBeUndefined();
    // No script injected when the SDK is already loaded.
    expect(injectedCount()).toBe(0);
  });

  it('injects the official script and resolves once the SDK is ready', async () => {
    const promise = loadRazorpaySdk();
    const script = injectedScript();

    expect(script.src).toBe(RAZORPAY_CHECKOUT_URL);
    expect(script.async).toBe(true);

    // Simulate the CDN delivering the SDK: it sets window.Razorpay then the
    // load event fires.
    window.Razorpay = mockCtor;
    script.dispatchEvent(new Event('load'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('deduplicates concurrent callers into a single script injection', async () => {
    const first = loadRazorpaySdk();
    const second = loadRazorpaySdk();

    expect(first).toBe(second);
    expect(injectedCount()).toBe(1);
  });

  it('returns a resolved promise for later calls after a successful load', async () => {
    const promise = loadRazorpaySdk();
    window.Razorpay = mockCtor;
    injectedScript().dispatchEvent(new Event('load'));
    await promise;

    await expect(loadRazorpaySdk()).resolves.toBeUndefined();
    expect(injectedCount()).toBe(1);
  });

  it('rejects when the script fails to load and removes the dead tag', async () => {
    const promise = loadRazorpaySdk();
    const script = injectedScript();

    script.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Razorpay Checkout SDK failed to load');
    expect(injectedCount()).toBe(0);
  });

  it('retries from scratch after a failure', async () => {
    const failed = loadRazorpaySdk();
    injectedScript().dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow();

    // A second call starts a fresh load instead of lingering on the old one.
    const retry = loadRazorpaySdk();
    expect(injectedCount()).toBe(1);

    window.Razorpay = mockCtor;
    injectedScript().dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBeUndefined();
  });

  it('rejects when the script loads but window.Razorpay is missing', async () => {
    const promise = loadRazorpaySdk();
    // No window.Razorpay set — the tag fired load but exposed no constructor.
    injectedScript().dispatchEvent(new Event('load'));

    await expect(promise).rejects.toThrow(/without exposing the checkout constructor/i);
    expect(injectedCount()).toBe(0);
  });

  it('rejects if the SDK never loads before the timeout', async () => {
    vi.useFakeTimers();
    const promise = loadRazorpaySdk();
    // Attach the rejection handler before advancing timers so the timeout
    // rejection is consumed, not flagged as unhandled.
    const assertion = expect(promise).rejects.toThrow(/timed out while loading/i);

    await vi.advanceTimersByTimeAsync(RAZORPAY_SDK_LOAD_TIMEOUT_MS);
    await assertion;
    expect(injectedCount()).toBe(0);
  });
});