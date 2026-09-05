/**
 * donations — service layer for donation initiation, payment verification,
 * and donation history. Uses the shared http client.
 */
import { http } from './http';
import type {
  Donation,
  DonationInitiateRequest,
  DonationInitiateResponse,
  DonationVerifyRequest,
  Paginated,
} from '@/types/api';

/** Initiate a donation — creates a Razorpay order server-side. */
export function initiateDonation(data: DonationInitiateRequest) {
  return http.post<DonationInitiateResponse>('/api/v1/donations/', data);
}

/** Verify a Razorpay payment after checkout completes. */
export function verifyPayment(
  donationId: number,
  data: DonationVerifyRequest,
) {
  return http.post<Donation>(
    `/api/v1/donations/${donationId}/verify_payment/`,
    data,
  );
}

/** Query parameters for the current user's donation list. */
export interface DonationListParams {
  page?: number;
  /** Text search across campaign title and message. */
  search?: string;
  /** DonationStatus filter. */
  status?: string;
  /** Ordering: 'created_at' | '-created_at' | 'amount' | '-amount'. */
  ordering?: string;
}

/** Fetch a single donation by id (ownership enforced server-side). */
export function getDonation(id: number) {
  return http.get<Donation>(`/api/v1/donations/${id}/`);
}

/** Fetch the current user's donations with optional filters/sort/search. */
export function listMyDonations(params: DonationListParams = {}) {
  return http.get<Paginated<Donation>>('/api/v1/donations/', {
    params: params as Record<string, string | number | undefined>,
  });
}
