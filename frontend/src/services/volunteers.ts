/**
 * volunteers — service layer for the volunteer management domain.
 * Covers opportunity CRUD and application status management for charities.
 */
import { http } from './http';
import type {
  ApplicationStatus,
  Paginated,
  VolunteerApplication,
  VolunteerOpportunity,
} from '@/types/api';

/* ----------------------------- Opportunities ----------------------------- */

export interface OpportunityListParams {
  page?: number;
  status?: string;
  search?: string;
}

export function listOpportunities(params: OpportunityListParams = {}) {
  return http.get<Paginated<VolunteerOpportunity>>('/api/v1/volunteers/opportunities/', {
    params: params as Record<string, string | number | undefined>,
  });
}

/** Fetch a single opportunity (retrieve is open to authenticated users). */
export function getOpportunity(id: number) {
  return http.get<VolunteerOpportunity>(`/api/v1/volunteers/opportunities/${id}/`);
}

/**
 * Fetch every opportunity by following the pagination `next` links.
 * The opportunities API has no search/filter support, so pages that need the
 * full dataset (dashboard stats, client-side discovery filtering) use this.
 */
export async function listAllOpportunities(): Promise<VolunteerOpportunity[]> {
  const results: VolunteerOpportunity[] = [];
  let page = 1;
  let next: string | null = '';
  do {
    const data = await listOpportunities({ page });
    results.push(...data.results);
    next = data.next;
    page += 1;
  } while (next);
  return results;
}

export function createOpportunity(data: {
  title: string;
  charity_organization: number;
  campaign?: number | null;
  description: string;
  location: string;
  event_date: string;
  slots_available: number;
}) {
  return http.post<VolunteerOpportunity>('/api/v1/volunteers/opportunities/', data);
}

export function updateOpportunity(id: number, data: Record<string, unknown>) {
  return http.patch<VolunteerOpportunity>(`/api/v1/volunteers/opportunities/${id}/`, data);
}

export function deleteOpportunity(id: number) {
  return http.delete<unknown>(`/api/v1/volunteers/opportunities/${id}/`);
}

/* ----------------------------- Applications ------------------------------ */

export interface ApplicationListParams {
  page?: number;
  status?: string;
}

export function listApplications(params: ApplicationListParams = {}) {
  return http.get<Paginated<VolunteerApplication>>('/api/v1/volunteers/applications/', {
    params: params as Record<string, string | number | undefined>,
  });
}

/**
 * Fetch every application for the current user by following pagination.
 * The volunteer application list is server-filtered to the caller's own
 * applications, so this returns only data the volunteer may see.
 */
export async function listAllApplications(): Promise<VolunteerApplication[]> {
  const results: VolunteerApplication[] = [];
  let page = 1;
  let next: string | null = '';
  do {
    const data = await listApplications({ page });
    results.push(...data.results);
    next = data.next;
    page += 1;
  } while (next);
  return results;
}

/** Apply to an opportunity on behalf of the current volunteer (POST). */
export function createApplication(data: { opportunity: number; statement?: string }) {
  return http.post<VolunteerApplication>('/api/v1/volunteers/applications/', data);
}

/** Fetch a single application (retrieve is ownership-checked by the backend). */
export function getApplication(id: number) {
  return http.get<VolunteerApplication>(`/api/v1/volunteers/applications/${id}/`);
}

export function updateApplicationStatus(
  id: number,
  status: ApplicationStatus,
) {
  return http.post<VolunteerApplication>(`/api/v1/volunteers/applications/${id}/update_status/`, {
    status,
  });
}
