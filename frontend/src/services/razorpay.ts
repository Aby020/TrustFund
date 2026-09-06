/**
 * razorpay — Razorpay Checkout SDK loader.
 *
 * The Razorpay browser SDK (checkout.js) ships as a global script, not an npm
 * package. This module injects the official script once, deduplicates
 * concurrent callers, and resolves a promise only once `window.Razorpay` is
 * actually ready to construct — so a donation page can never hit
 * "window.Razorpay is not a constructor".
 *
 * Only the public Key ID ever reaches the browser (via VITE_RAZORPAY_KEY_ID).
 * The Key Secret stays entirely server-side; the browser only ever holds an
 * order id it cannot forge.
 */

/** Official Razorpay Checkout SDK script URL (v1 is the current stable line). */
export const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/** How long to wait for the SDK script before giving up and surfacing an error. */
export const RAZORPAY_SDK_LOAD_TIMEOUT_MS = 15_000;

/** `id` we stamp on the injected script so repeated loads can be detected. */
const SDK_SCRIPT_ID = 'razorpay-checkout-sdk';

/* -------------------------------------------------------------------------- */
/*  SDK types                                                                  */
/* -------------------------------------------------------------------------- */

/** Response delivered by Razorpay to the checkout `handler` after payment. */
export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Options accepted by the Razorpay Checkout constructor. */
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

/** The constructed Checkout instance. */
export interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/* -------------------------------------------------------------------------- */
/*  Loader                                                                     */
/* -------------------------------------------------------------------------- */

let loadPromise: Promise<void> | null = null;

/**
 * Load the Razorpay Checkout SDK and resolve once `window.Razorpay` is ready.
 *
 * Safe to call any number of times: resolves immediately if the SDK is
 * already present, and shares a single in-flight load between concurrent
 * callers so the script is never injected twice. Rejects with a descriptive
 * Error if the script fails, stalls, or loads without exposing `Razorpay`, so
 * the caller can show a friendly message instead of crashing the checkout.
 */
export function loadRazorpaySdk(): Promise<void> {
  // Already available — nothing to do. This also covers SPA navigations where
  // a previous page already pulled the SDK down.
  if (window.Razorpay) return Promise.resolve();

  // Reuse the in-flight load so parallel clicks cannot double-inject.
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanupHandlers = (
      script: HTMLScriptElement,
      onLoad: () => void,
      onError: () => void,
      timer?: number,
    ) => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      if (timer !== undefined) window.clearTimeout(timer);
    };

    const fail = (script: HTMLScriptElement, message: string) => {
      if (settled) return;
      settled = true;
      // Drop the failed tag and cached state so a later call retries cleanly
      // instead of hanging on a dead script element.
      script?.remove();
      loadPromise = null;
      reject(new Error(message));
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      loadPromise = null; // Browser caches the SDK; future calls short-circuit above.
      resolve();
    };

    // An existing tag can come from a prior injection attempt (SPA) or a
    // host page. Reattach to it instead of injecting a duplicate.
    const existing = document.querySelector<HTMLScriptElement>(
      `script#${SDK_SCRIPT_ID}, script[src="${RAZORPAY_CHECKOUT_URL}"]`,
    );

    const attach = (script: HTMLScriptElement) => {
      const timer = window.setTimeout(() => {
        cleanupHandlers(script, onLoad, onError, timer);
        fail(script, `Razorpay Checkout SDK timed out while loading (${RAZORPAY_SDK_LOAD_TIMEOUT_MS}ms).`);
      }, RAZORPAY_SDK_LOAD_TIMEOUT_MS);

      function onLoad() {
        cleanupHandlers(script, onLoad, onError, timer);
        // The SDK sets `window.Razorpay` by the time its script finishes. If
        // the tag loaded but the global is missing (ad-blocker, CDN rewrite),
        // fail loudly rather than produce a phantom checkout.
        if (window.Razorpay) {
          succeed();
        } else {
          fail(script, 'Razorpay Checkout SDK loaded without exposing the checkout constructor.');
        }
      }

      function onError() {
        cleanupHandlers(script, onLoad, onError, timer);
        fail(script, 'Razorpay Checkout SDK failed to load.');
      }

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
    };

    if (existing) {
      attach(existing);
      return;
    }

    const script = document.createElement('script');
    script.id = SDK_SCRIPT_ID;
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    attach(script);
    document.body.appendChild(script);
  });

  return loadPromise;
}

/**
 * Test hook — clears the module's cached load state so a subsequent
 * `loadRazorpaySdk()` call simulates a fresh load (e.g. after simulating an
 * SDK failure). Not used in application code.
 */
export function resetRazorpaySdkState(): void {
  loadPromise = null;
}