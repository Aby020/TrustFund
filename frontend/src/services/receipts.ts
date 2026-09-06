/**
 * receipts — service layer for receipt listing and PDF download.
 * Uses the shared http client for JSON; the binary PDF is fetched directly
 * (the shared client only parses JSON) while reusing the same token source.
 */
import { http, API_BASE_URL } from './http';
import { getAccessToken } from './token-store';
import type { Paginated, Receipt } from '@/types/api';

/** Fetch the current user's receipts. */
export function listReceipts(page = 1) {
  return http.get<Paginated<Receipt>>('/api/v1/receipts/', { params: { page } });
}

/** Fetch a single receipt by id. */
export function getReceipt(id: number) {
  return http.get<Receipt>(`/api/v1/receipts/${id}/`);
}

/** Download receipt PDF — returns the blob for the caller to consume. */
export async function downloadReceiptPdf(receiptId: number): Promise<Blob> {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/pdf' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(
    new URL(`/api/v1/receipts/${receiptId}/download_pdf/`, API_BASE_URL).toString(),
    { headers },
  );
  if (!response.ok) {
    throw new Error(`Failed to download receipt (HTTP ${response.status}).`);
  }
  return response.blob();
}

/** Download a receipt PDF to the browser (creates + revokes an object URL). */
export async function downloadReceipt(
  receiptId: number,
  receiptNumber?: string | null,
): Promise<void> {
  const blob = await downloadReceiptPdf(receiptId);
  const filename = receiptNumber
    ? `TrustFund-Receipt-${receiptNumber}.pdf`
    : `Receipt_${receiptId}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Defer revoking the object URL so the browser has time to begin reading
  // the blob. Revoking synchronously can silently cancel the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}