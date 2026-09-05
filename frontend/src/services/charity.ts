/**
 * charity — service layer for charity organization management.
 * Covers: view, edit, verification workflow (submit, resubmit).
 */
import { http } from './http';
import type { CharityOrganization } from '@/types/api';

/** Fetch the current user's charity organization. */
export function getMyOrganization() {
  return http.get<CharityOrganization>('/api/v1/charities/me/');
}

/** Create a new charity organization. */
export function createOrganization(data: {
  name: string;
  description: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  registration_number: string;
}) {
  // Optional fields must be OMITTED (not sent as '') when blank so the backend
  // applies its model defaults. Sending '' for a blank=False field such as
  // `country` (defaults to 'United States') would otherwise 400 the request
  // with "This field may not be blank." — JSON.stringify drops `undefined` keys.
  const payload = {
    name: data.name,
    description: data.description,
    email: data.email,
    phone: data.phone || undefined,
    website: data.website || undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    country: data.country || undefined,
    registration_number: data.registration_number,
  };
  return http.post<CharityOrganization>('/api/v1/charities/create/', payload);
}

/** Update the current user's charity organization. */
export function updateOrganization(id: number, data: object) {
  return http.patch<CharityOrganization>(`/api/v1/charities/${id}/`, data);
}

/** Submit organization for verification. */
export function submitForVerification(id: number) {
  return http.post<CharityOrganization>(`/api/v1/charities/${id}/submit/`);
}

/** Resubmit organization after rejection. */
export function resubmitForVerification(id: number) {
  return http.post<CharityOrganization>(`/api/v1/charities/${id}/resubmit/`);
}

/** Fetch verification history for an organization. */
export function getVerificationHistory(id: number) {
  return http.get<{ id: number; action: string; action_display: string; performed_by_name: string; from_status: string; to_status: string; reason: string; created_at: string }[]>(
    `/api/v1/charities/${id}/history/`,
  );
}
