/**
 * dashboard — service layer for authenticated dashboard metrics.
 * Exposes both the donor and charity aggregate dashboards.
 */
import { http } from './http';
import type { CharityDashboard, DonorDashboard } from '@/types/api';

/** Fetch the current donor's aggregate dashboard metrics. */
export function getDonorDashboard() {
  return http.get<DonorDashboard>('/api/v1/dashboard/donor/');
}

/** Fetch the current charity's aggregate dashboard metrics. */
export function getCharityDashboard() {
  return http.get<CharityDashboard>('/api/v1/dashboard/charity/');
}
