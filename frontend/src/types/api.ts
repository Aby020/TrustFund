/**
 * Shared API types reflecting the TrustFund Django/DRF backend.
 * These are structural only — the backend is untouched.
 */

/** Normalized error thrown by the API client. */
export interface ApiError {
  /** HTTP status, or 0 for network/timeout failures. */
  status: number;
  /** Human-readable message. */
  message: string;
  /** Field-level errors when the backend returns them. */
  fieldErrors?: Record<string, string[]>;
}

/** Standard DRF page-number pagination payload. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Role values from backend `users.models.Role`. */
export type UserRole = 'DONOR' | 'CHARITY' | 'VOLUNTEER' | 'ADMIN';

/** Verification lifecycle from backend `charities.models.VerificationStatus`. */
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

/** Campaign lifecycle from backend `campaigns.models.CampaignStatus`. */
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

/** Categories from backend `campaigns.models.CampaignCategory`. */
export type CampaignCategory =
  | 'MEDICAL'
  | 'EDUCATION'
  | 'DISASTER_RELIEF'
  | 'ENVIRONMENT'
  | 'ANIMALS'
  | 'COMMUNITY'
  | 'CHILDREN'
  | 'FOOD'
  | 'POVERTY'
  | 'OTHER';

/** Payment lifecycle from backend `donations.models.DonationStatus`. */
export type DonationStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

/** Volunteer opportunity status from backend `volunteers.models`. */
export type OpportunityStatus = 'OPEN' | 'CLOSED' | 'COMPLETED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ATTENDED';