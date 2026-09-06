/**
 * Unit tests for the receipt PDF download service.
 *
 * The download flow must authenticate with the stored JWT, request the PDF
 * endpoint, surface non-OK responses as errors, and hand the browser a named
 * blob URL for download. jsdom cannot actually download, so the browser side
 * (createObjectURL / anchor click / revokeObjectURL) is stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from './http';
import { downloadReceipt, downloadReceiptPdf } from './receipts';
import { getAccessToken } from './token-store';

vi.mock('./http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./http')>();
  return { ...actual, http: { get: vi.fn(), post: vi.fn() } };
});

vi.mock('./token-store', () => ({
  getAccessToken: vi.fn(),
}));

const mockGetAccessToken = vi.mocked(getAccessToken);

const RECEIPT_ID = 42;
const EXPECTED_URL = `${API_BASE_URL}/api/v1/receipts/${RECEIPT_ID}/download_pdf/`;

/** Minimal stub of the browser download trigger for downloadReceipt tests. */
function stubBlobBrowser() {
  const createObjectURL = vi.fn(() => 'blob:receipt-test');
  const revokeObjectURL = vi.fn();
  const click = vi.fn();

  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: revokeObjectURL,
  });

  // jsdom's HTMLAnchorElement.click() would attempt a real navigation; the
  // download trigger only needs the click to fire so we can assert on it.
  Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
    writable: true,
    value: click,
  });

  return { createObjectURL, revokeObjectURL, click };
}

describe('receipts download service', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockGetAccessToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('downloadReceiptPdf', () => {
    it('requests the download endpoint with the JWT and Accept: application/pdf', async () => {
      mockGetAccessToken.mockReturnValue('test-access-token');

      const pdf = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const blob = await downloadReceiptPdf(RECEIPT_ID);

      expect(fetchMock).toHaveBeenCalledWith(
        EXPECTED_URL,
        expect.objectContaining({
          headers: {
            Accept: 'application/pdf',
            Authorization: 'Bearer test-access-token',
          },
        }),
      );
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('sends no Authorization header when no token is stored', async () => {
      mockGetAccessToken.mockReturnValue(null);

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(new Blob(['%PDF']), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);

      await downloadReceiptPdf(RECEIPT_ID);

      expect(fetchMock).toHaveBeenCalledWith(
        EXPECTED_URL,
        expect.objectContaining({ headers: { Accept: 'application/pdf' } }),
      );
    });

    it('throws and does not return a blob on a non-OK response', async () => {
      mockGetAccessToken.mockReturnValue('test-access-token');
      const fetchMock = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(downloadReceiptPdf(RECEIPT_ID)).rejects.toThrow(/HTTP 403/);
    });
  });

  describe('downloadReceipt', () => {
    it('downloads a branded blob filename and defers revoking its object URL', async () => {
      vi.useFakeTimers();
      mockGetAccessToken.mockReturnValue('test-access-token');

      const pdf = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const { createObjectURL, revokeObjectURL, click } = stubBlobBrowser();
      const appendChild = vi.spyOn(document.body, 'appendChild');

      await downloadReceipt(RECEIPT_ID, 'TRF-20260905-A45A9D');

      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(click).toHaveBeenCalledTimes(1);

      // The download anchor carries the TrustFund-branded filename built from
      // the receipt number, matching the backend Content-Disposition header.
      const anchor = appendChild.mock.calls
        .map((call) => call[0])
        .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
      expect(anchor).toBeDefined();
      expect(anchor!.download).toBe('TrustFund-Receipt-TRF-20260905-A45A9D.pdf');
      expect(anchor!.href).toBe('blob:receipt-test');

      // Object URL must survive past the click so the browser can read the blob.
      expect(revokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    });

    it('uses a fallback filename when no receipt number is provided', async () => {
      vi.useFakeTimers();
      mockGetAccessToken.mockReturnValue('test-access-token');

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(new Blob(['%PDF']), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);

      stubBlobBrowser();
      // Capture the anchor element created for the download.
      const appendChild = vi.spyOn(document.body, 'appendChild');
      const anchorBefore = appendChild.mock;

      await downloadReceipt(RECEIPT_ID);

      const anchor = anchorBefore.calls
        .map((call) => call[0])
        .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
      expect(anchor).toBeDefined();
      expect(anchor!.download).toBe(`Receipt_${RECEIPT_ID}.pdf`);
      expect(anchor!.href).toBe('blob:receipt-test');
    });
  });
});