/**
 * charities-directory — public charity directory.
 *
 * The authenticated charity API (`/api/v1/charities/`) exposes owner/contact
 * details and requires a session, so it is not suitable for a public page and
 * must never surface private organization information. Instead this service
 * derives the public directory from the existing **public** campaigns API
 * (`/api/v1/campaigns/`, AllowAny), which already returns a campaign's owning
 * organization name and verification flag. Grouping active public campaigns by
 * organization yields a safe, honest list of verified charities — only the
 * information already public on the platform, with direct links into their
 * campaigns.
 *
 * No backend functionality is invented: this is a client-side aggregation of
 * data the platform already serves publicly.
 */
import { listCampaigns } from './campaigns';
import type { Campaign, CampaignCategory } from '@/types/api';

/** A public campaign owned by a charity, used to link into its campaigns. */
export interface CharityCampaign {
  id: number;
  title: string;
  category: CampaignCategory;
  category_display: string;
}

/** A verified charity surfaced on the public directory page. */
export interface CharitySummary {
  id: number;
  name: string;
  /** Best-known location, taken from the charity's public campaigns. */
  location: string;
  campaignCount: number;
  /** Distinct campaign categories the charity is active in. */
  categories: CampaignCategory[];
  campaigns: CharityCampaign[];
}

/**
 * Safety cap on the number of campaign pages fetched while building the
 * directory, so a long tail of campaigns cannot trigger unbounded requests.
 * (20 campaigns/page × 10 pages = up to 200 active campaigns.)
 */
const MAX_CAMPAIGN_PAGES = 10;

/**
 * Fetch the public directory of verified charities.
 *
 * Paginates through public (ACTIVE) campaigns, groups them by their owning
 * organization, and returns only organizations flagged verified. Results are
 * sorted alphabetically by name.
 */
export async function listVerifiedCharities(): Promise<CharitySummary[]> {
  const campaigns: Campaign[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= MAX_CAMPAIGN_PAGES) {
    const data = await listCampaigns({ page });
    campaigns.push(...data.results);
    hasNext = Boolean(data.next);
    page += 1;
  }

  const byOrg = new Map<number, CharitySummary>();

  for (const campaign of campaigns) {
    // Defensive: only surface verified organizations. Public campaign listings
    // are ACTIVE-only (which implies a verified owner), but guard regardless so
    // an unverified organization is never shown.
    if (!campaign.organization_verified) continue;

    let summary = byOrg.get(campaign.organization);
    if (!summary) {
      summary = {
        id: campaign.organization,
        name: campaign.organization_name,
        location: '',
        campaignCount: 0,
        categories: [],
        campaigns: [],
      };
      byOrg.set(campaign.organization, summary);
    }

    if (!summary.location && campaign.location) summary.location = campaign.location;
    if (!summary.categories.includes(campaign.category)) {
      summary.categories.push(campaign.category);
    }
    summary.campaigns.push({
      id: campaign.id,
      title: campaign.title,
      category: campaign.category,
      category_display: campaign.category_display,
    });
    summary.campaignCount = summary.campaigns.length;
  }

  return [...byOrg.values()].sort((a, b) => a.name.localeCompare(b.name));
}
