/**
 * admin — service layer for the platform Administration experience.
 * Wraps the admin-gated dashboard, analytics, verification workflow, and the
 * admin-only user + audit-log endpoints. Authorization (ADMIN only) is
 * enforced server-side; these clients simply surface the existing APIs.
 */
import { http } from './http';
import type {
  AdminAnalytics,
  AdminDashboard,
  AdminUser,
  AuditLog,
  CharityOrganization,
  Donation,
  Paginated,
  VerificationHistoryEntry,
} from '@/types/api';
import type { Campaign } from '@/types/api';

/* ------------------------- Platform dashboards --------------------------- */

/** GET /api/v1/dashboard/admin/ — system-wide metrics. */
export function getAdminDashboard() {
  return http.get<AdminDashboard>('/api/v1/dashboard/admin/');
}

/** GET /api/v1/dashboard/analytics/ — donation analytics. */
export function getAdminAnalytics() {
  return http.get<AdminAnalytics>('/api/v1/dashboard/analytics/');
}

/* -------------------- Charity organizations & verification ---------------- */

export interface OrganizationListParams {
  /** VerificationStatus filter (admins only): PENDING | VERIFIED | REJECTED. */
  status?: string;
}

/**
 * GET /api/v1/charities/ — admins see every organization (plain array, not
 * paginated). Optionally filtered by verification status.
 */
export function listOrganizations(params: OrganizationListParams = {}) {
  return http.get<CharityOrganization[]>('/api/v1/charities/', {
    params: params as Record<string, string | undefined>,
  });
}

/** GET /api/v1/charities/{id}/ — detail for admins/owners/verified. */
export function getOrganization(id: number) {
  return http.get<CharityOrganization>(`/api/v1/charities/${id}/`);
}

/** POST /api/v1/charities/{id}/approve/ — approve a pending organization. */
export function approveVerification(id: number) {
  return http.post<CharityOrganization>(`/api/v1/charities/${id}/approve/`);
}

/** POST /api/v1/charities/{id}/reject/ — reject with a required reason. */
export function rejectVerification(id: number, rejectionReason: string) {
  return http.post<CharityOrganization>(`/api/v1/charities/${id}/reject/`, {
    rejection_reason: rejectionReason,
  });
}

/** GET /api/v1/charities/{id}/history/ — the verification audit trail. */
export function getVerificationHistory(id: number) {
  return http.get<VerificationHistoryEntry[]>(
    `/api/v1/charities/${id}/history/`,
  );
}

/* ----------------------------- Admin users ------------------------------- */

export interface AdminUserListParams {
  page?: number;
  /** Search across email / first name / last name. */
  search?: string;
  /** Role filter: DONOR | CHARITY | VOLUNTEER | ADMIN. */
  role?: string;
  /** Active filter: 'true' | 'false'. */
  is_active?: string;
  ordering?: string;
}

/** GET /api/v1/admin/users/ — paginated, admin-only user list. */
export function listAdminUsers(params: AdminUserListParams = {}) {
  return http.get<Paginated<AdminUser>>('/api/v1/admin/users/', {
    params: params as Record<string, string | number | undefined>,
  });
}

/* ------------------------------ Audit logs ------------------------------- */

export interface AuditLogListParams {
  page?: number;
  /** AuditAction filter, e.g. VERIFICATION_APPROVE. */
  action?: string;
  /** Resource type filter, e.g. CharityOrganization | Campaign. */
  resource_type?: string;
  /** Search across resource label / detail. */
  search?: string;
}

/** GET /api/v1/admin/audit-logs/ — paginated, admin-only audit trail. */
export function listAuditLogs(params: AuditLogListParams = {}) {
  return http.get<Paginated<AuditLog>>('/api/v1/admin/audit-logs/', {
    params: params as Record<string, string | number | undefined>,
  });
}

/* ------------------- Campaigns & donations (admin views) ------------------ */

export interface AdminCampaignListParams {
  page?: number;
  search?: string;
  category?: string;
  status?: string;
  ordering?: string;
}

/** GET /api/v1/campaigns/ — admins see every campaign (all statuses). */
export function listAdminCampaigns(params: AdminCampaignListParams = {}) {
  return http.get<Paginated<Campaign>>('/api/v1/campaigns/', {
    params: params as Record<string, string | number | undefined>,
  });
}

export interface AdminDonationListParams {
  page?: number;
  search?: string;
  status?: string;
  ordering?: string;
}

/** GET /api/v1/donations/ — admins see every platform donation. */
export function listAdminDonations(params: AdminDonationListParams = {}) {
  return http.get<Paginated<Donation>>('/api/v1/donations/', {
    params: params as Record<string, string | number | undefined>,
  });
}