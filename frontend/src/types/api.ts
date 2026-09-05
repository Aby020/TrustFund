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

/** Notification kinds from backend `notifications.models.NotificationType`. */
export type NotificationType =
  | 'DONATION_SUCCESSFUL'
  | 'CAMPAIGN_MILESTONE'
  | 'CAMPAIGN_UPDATE'
  | 'CAMPAIGN_ENDING_SOON'
  | 'VOLUNTEER_APPROVED'
  | 'VOLUNTEER_REJECTED'
  | 'RECEIPT_GENERATED';

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

/* -------------------------------------------------------------------------- */
/*  Campaign types — mirrors backend campaigns app                            */
/* -------------------------------------------------------------------------- */

/** Campaign from backend campaigns.models.Campaign (CampaignSerializer). */
export interface Campaign {
  id: number;
  organization: number;
  organization_name: string;
  /** Whether the owning charity organization is VERIFIED. */
  organization_verified?: boolean;
  title: string;
  description: string;
  category: CampaignCategory;
  category_display: string;
  goal_amount: string;
  raised_amount: string;
  location: string;
  image: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  status_display: string;
  created_at: string;
  updated_at: string;
}

/** Campaign update from backend campaigns.models.CampaignUpdate. */
export interface CampaignUpdate {
  id: number;
  campaign: number;
  campaign_title: string;
  title: string;
  content: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Donation types — mirrors backend donations app                            */
/* -------------------------------------------------------------------------- */

/** Donation from backend donations.models.Donation (DonationSerializer). */
export interface Donation {
  id: number;
  donor: number;
  donor_email: string;
  campaign: number;
  campaign_title: string;
  campaign_image: string | null;
  amount: string;
  currency: string;
  status: DonationStatus;
  status_display: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  is_anonymous: boolean;
  message: string;
  created_at: string;
  updated_at: string;
  /** Linked receipt, present once the payment is SUCCESS (null otherwise). */
  receipt_id: number | null;
  receipt_number: string | null;
}

/** POST /api/v1/donations/ — initiate donation request body. */
export interface DonationInitiateRequest {
  campaign: number;
  amount: number;
  currency?: string;
  is_anonymous?: boolean;
  message?: string;
  idempotency_key: string;
}

/** Response from donation initiation — contains Razorpay order details. */
export interface DonationInitiateResponse {
  id: number;
  razorpay_order_id: string;
  amount: string;
  currency: string;
  status: DonationStatus;
}

/** POST /api/v1/donations/{id}/verify_payment/ — request body. */
export interface DonationVerifyRequest {
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/* -------------------------------------------------------------------------- */
/*  Receipt types — mirrors backend receipts app                              */
/* -------------------------------------------------------------------------- */

/** Receipt from backend receipts.models.Receipt (ReceiptSerializer). */
export interface Receipt {
  id: number;
  receipt_number: string;
  donation: number;
  donor: number;
  donor_email: string;
  campaign: number;
  campaign_title: string;
  charity_organization: number;
  charity_name: string;
  amount: string;
  currency: string;
  transaction_reference: string;
  donation_date: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Notification types — mirrors backend notifications app                    */
/* -------------------------------------------------------------------------- */

/** Notification from backend notifications.models.Notification. */
export interface AppNotification {
  id: number;
  recipient: number;
  notification_type: NotificationType;
  notification_type_display: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Donor dashboard — mirrors backend dashboard DonorDashboardView            */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/dashboard/donor/ — aggregate donor metrics. */
export interface DonorDashboard {
  /** Sum of SUCCESS donations, as a decimal string. */
  total_donated: string;
  /** Total donations across all statuses. */
  donation_count: number;
  /** Distinct campaigns with at least one SUCCESS donation. */
  campaigns_supported: number;
  /** Number of receipts issued to the donor. */
  total_receipts: number;
  recent_donations: {
    id: number;
    campaign_title: string;
    organization_name: string;
    amount: string;
    created_at: string;
  }[];
}

/* -------------------------------------------------------------------------- */
/*  Charity types — mirrors backend charities app                             */
/* -------------------------------------------------------------------------- */

/** Charity organization from backend charities.models.CharityOrganization. */
export interface CharityOrganization {
  id: number;
  owner: number;
  owner_email: string;
  owner_name: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  registration_number: string;
  verification_status: VerificationStatus;
  verification_status_display: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Charity dashboard — mirrors backend dashboard CharityDashboardView        */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/dashboard/charity/ — aggregate charity metrics. */
export interface CharityDashboard {
  organization: {
    id: number;
    name: string;
    verification_status: VerificationStatus;
    is_verified: boolean;
  } | null;
  campaigns_count: number;
  active_campaigns_count: number;
  total_raised: string;
  recent_donations: {
    id: number;
    campaign_title: string;
    donor_name: string;
    amount: string;
    created_at: string;
  }[];
}

/* -------------------------------------------------------------------------- */
/*  Volunteer types — mirrors backend volunteers app                          */
/* -------------------------------------------------------------------------- */

/** Volunteer opportunity from backend volunteers.models.VolunteerOpportunity. */
export interface VolunteerOpportunity {
  id: number;
  title: string;
  charity_organization: number;
  charity_name: string;
  campaign: number | null;
  campaign_title: string | null;
  description: string;
  location: string;
  event_date: string;
  slots_available: number;
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
}

/** Volunteer application from backend volunteers.models.VolunteerApplication. */
export interface VolunteerApplication {
  id: number;
  opportunity: number;
  opportunity_title: string;
  volunteer: number;
  volunteer_name: string;
  status: ApplicationStatus;
  statement: string;
  applied_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Display helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Human-readable labels for campaign statuses. */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

/* -------------------------------------------------------------------------- */
/*  Display helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Human-readable labels for campaign categories. */
export const CATEGORY_LABELS: Record<CampaignCategory, string> = {
  MEDICAL: 'Medical',
  EDUCATION: 'Education',
  DISASTER_RELIEF: 'Disaster Relief',
  ENVIRONMENT: 'Environment',
  ANIMALS: 'Animals',
  COMMUNITY: 'Community',
  CHILDREN: 'Children',
  FOOD: 'Food',
  POVERTY: 'Poverty',
  OTHER: 'Other',
};

/** Human-readable labels for donation statuses. */
export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  PENDING: 'Pending',
  SUCCESS: 'Successful',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

/** Tone mapping for campaign status badges. */
export const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, string> = {
  DRAFT: 'info',
  ACTIVE: 'success',
  COMPLETED: 'success',
  EXPIRED: 'warning',
  CANCELLED: 'danger',
};

/** Tone mapping for verification status badges. */
export const VERIFICATION_STATUS_TONES: Record<VerificationStatus, string> = {
  PENDING: 'info',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

/** Human-readable labels for volunteer opportunity statuses. */
export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  COMPLETED: 'Completed',
};

/** Human-readable labels for volunteer application statuses. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ATTENDED: 'Attended',
};

/** Tone mapping for opportunity status badges. */
export const OPPORTUNITY_STATUS_TONES: Record<OpportunityStatus, string> = {
  OPEN: 'success',
  CLOSED: 'neutral',
  COMPLETED: 'info',
};

/** Tone mapping for application status badges. */
export const APPLICATION_STATUS_TONES: Record<ApplicationStatus, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ATTENDED: 'info',
};