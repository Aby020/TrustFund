/**
 * campaigns — service layer for campaign discovery, detail, and management.
 * Uses the shared http client; no extra dependencies.
 */
import { http } from './http';
import type { Campaign, CampaignUpdate, Paginated } from '@/types/api';

/** Query parameters for campaign list filtering. */
export interface CampaignListParams {
  page?: number;
  search?: string;
  category?: string;
  status?: string;
  location?: string;
  ordering?: string;
  organization?: number;
}

/** Fetch a paginated list of campaigns. */
export function listCampaigns(params: CampaignListParams = {}) {
  return http.get<Paginated<Campaign>>('/api/v1/campaigns/', {
    params: params as Record<string, string | number | undefined>,
  });
}

/** Fetch a single campaign by id. */
export function getCampaign(id: number) {
  return http.get<Campaign>(`/api/v1/campaigns/${id}/`);
}

/** Fetch updates for a campaign. */
export function listCampaignUpdates(campaignId: number) {
  return http.get<Paginated<CampaignUpdate>>(
    `/api/v1/campaigns/${campaignId}/updates/`,
  );
}

/* ---------------------------- Write operations ---------------------------- */

/**
 * Create a new campaign. Verified charities' campaigns start ACTIVE (live).
 * Accepts FormData (multipart) for image uploads or a plain object (JSON).
 */
export function createCampaign(data: FormData) {
  return http.postForm<Campaign>('/api/v1/campaigns/', data);
}

/**
 * Update a campaign (status transitions validated by the backend).
 * Accepts FormData (multipart) for image uploads or a plain object (JSON).
 */
export function updateCampaign(
  id: number,
  data: FormData,
) {
  return http.patchForm<Campaign>(`/api/v1/campaigns/${id}/`, data);
}

/** Delete a campaign. */
export function deleteCampaign(id: number) {
  return http.delete<unknown>(`/api/v1/campaigns/${id}/`);
}

/** Cancel a campaign via its lifecycle transition. */
export function cancelCampaign(id: number) {
  return http.post<Campaign>(`/api/v1/campaigns/${id}/cancel/`);
}

/** Create a new update for a campaign. */
export function createCampaignUpdate(
  campaignId: number,
  data: { title: string; content: string },
) {
  return http.post<CampaignUpdate>(
    `/api/v1/campaigns/${campaignId}/updates/`,
    data,
  );
}

/** Update a campaign update. */
export function updateCampaignUpdate(
  updateId: number,
  data: { title: string; content: string },
) {
  return http.patch<CampaignUpdate>(
    `/api/v1/campaigns/updates/${updateId}/`,
    data,
  );
}

/** Delete a campaign update. */
export function deleteCampaignUpdate(updateId: number) {
  return http.delete<unknown>(`/api/v1/campaigns/updates/${updateId}/`);
}
