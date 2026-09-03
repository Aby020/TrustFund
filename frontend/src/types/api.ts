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

/* -------------------------------------------------------------------------- */
/*  Authentication API types — mirrors the Django/DRF auth endpoints.         */
/* -------------------------------------------------------------------------- */

/** User profile returned by /auth/me and inside auth responses. */
export interface ApiUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
}

/** POST /api/v1/auth/login — request body. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/v1/auth/register — request body. */
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
}

/** POST /api/v1/auth/refresh — request body. */
export interface RefreshRequest {
  refresh: string;
}

/** POST /api/v1/auth/logout — request body. */
export interface LogoutRequest {
  refresh: string;
}

/** Auth response shape returned by login and register endpoints. */
export interface AuthTokensResponse {
  user: ApiUser;
  access: string;
  refresh: string;
}

/** Token refresh response. */
export interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}