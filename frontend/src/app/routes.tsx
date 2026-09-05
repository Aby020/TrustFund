import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@/components';
import { AuthLayout } from '@/layouts/auth-layout/auth-layout';
import { ProtectedRoute, RequireRole } from '@/components';

/**
 * Central route table. Pages are code-split by default — add pages here,
 * never restructure the shell.
 */

type PageModule = { default: ComponentType };
type PageLoader = () => Promise<PageModule>;

function lazyPage(loader: PageLoader): LazyExoticComponent<ComponentType> {
  return lazy(loader);
}

/* ---- Public pages ---- */
const HomePage = lazyPage(() => import('@/pages/home/home'));
const NotFoundPage = lazyPage(() => import('@/pages/not-found/not-found'));

/* ---- Auth pages (inside AuthLayout) ---- */
const LoginPage = lazyPage(() => import('@/pages/auth/login/login'));
const RegisterPage = lazyPage(() => import('@/pages/auth/register/register'));

/* ---- Campaign pages ---- */
const CampaignDiscoveryPage = lazyPage(() => import('@/pages/campaigns/campaign-discovery'));
const CampaignDetailPage = lazyPage(() => import('@/pages/campaigns/campaign-detail'));
const DonatePage = lazyPage(() => import('@/pages/campaigns/donate'));
const DonationSuccessPage = lazyPage(() => import('@/pages/campaigns/donation-success'));

/* ---- Protected pages ---- */
const DashboardPage = lazyPage(() => import('@/pages/dashboard/dashboard'));

/* ---- Donor pages (role-gated) ---- */
const DonationHistoryPage = lazyPage(() => import('@/pages/donor/donation-history'));
const DonationDetailsPage = lazyPage(() => import('@/pages/donor/donation-details'));
const NotificationsPage = lazyPage(() => import('@/pages/donor/notifications'));

/* ---- Charity pages (role-gated) ---- */
const CharityDashboardPage = lazyPage(() => import('@/pages/charity/charity-dashboard'));
const CharityOrganizationPage = lazyPage(() => import('@/pages/charity/charity-organization'));
const CharityCampaignsPage = lazyPage(() => import('@/pages/charity/charity-campaigns'));
const CharityCampaignFormPage = lazyPage(() => import('@/pages/charity/charity-campaign-form'));
const CharityCampaignUpdatesPage = lazyPage(() => import('@/pages/charity/charity-campaign-updates'));
const CharityVolunteersPage = lazyPage(() => import('@/pages/charity/charity-volunteers'));
const CharityNotificationsPage = lazyPage(() => import('@/pages/charity/charity-notifications'));

/* ---- Volunteer pages (role-gated) ---- */
const VolunteerDashboardPage = lazyPage(() => import('@/pages/volunteer/volunteer-dashboard'));
const VolunteerOpportunitiesPage = lazyPage(() => import('@/pages/volunteer/volunteer-opportunities'));
const VolunteerOpportunityDetailPage = lazyPage(() => import('@/pages/volunteer/volunteer-opportunity-detail'));
const VolunteerApplicationsPage = lazyPage(() => import('@/pages/volunteer/volunteer-applications'));
const VolunteerApplicationDetailPage = lazyPage(() => import('@/pages/volunteer/volunteer-application-detail'));
const VolunteerNotificationsPage = lazyPage(() => import('@/pages/volunteer/volunteer-notifications'));

/** Shared fallback shown while a lazily-loaded page mounts. */
export function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* ---- Public routes ---- */}
        <Route path="/" element={<HomePage />} />

        {/* ---- Campaign routes (public) ---- */}
        <Route path="/campaigns" element={<CampaignDiscoveryPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />

        {/* ---- Donation routes (auth required) ---- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/campaigns/:id/donate" element={<DonatePage />} />
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Route>

        {/* ---- Auth routes (centered card layout) ---- */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* ---- Protected routes (require authentication) ---- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Role-gated routes — example structure for future pages */}
          <Route element={<RequireRole roles={['DONOR', 'ADMIN']} />}>
            <Route path="/donations" element={<DonationHistoryPage />} />
            <Route path="/donations/:id" element={<DonationDetailsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            {/* <Route path="/admin" element={<AdminPage />} /> */}
          </Route>
          <Route element={<RequireRole roles={['CHARITY', 'ADMIN']} />}>
            <Route path="/charity/manage" element={<CharityDashboardPage />} />
            <Route path="/charity/manage/organization" element={<CharityOrganizationPage />} />
            <Route path="/charity/manage/campaigns" element={<CharityCampaignsPage />} />
            <Route path="/charity/manage/campaigns/new" element={<CharityCampaignFormPage />} />
            <Route path="/charity/manage/campaigns/:id/edit" element={<CharityCampaignFormPage />} />
            <Route path="/charity/manage/campaigns/:id/updates" element={<CharityCampaignUpdatesPage />} />
            <Route path="/charity/manage/volunteers" element={<CharityVolunteersPage />} />
            <Route path="/charity/manage/notifications" element={<CharityNotificationsPage />} />
          </Route>
          <Route element={<RequireRole roles={['VOLUNTEER', 'ADMIN']} />}>
            <Route path="/volunteer/manage" element={<VolunteerDashboardPage />} />
            <Route path="/volunteer/manage/opportunities" element={<VolunteerOpportunitiesPage />} />
            <Route path="/volunteer/manage/opportunities/:id" element={<VolunteerOpportunityDetailPage />} />
            <Route path="/volunteer/manage/applications" element={<VolunteerApplicationsPage />} />
            <Route path="/volunteer/manage/applications/:id" element={<VolunteerApplicationDetailPage />} />
            <Route path="/volunteer/manage/notifications" element={<VolunteerNotificationsPage />} />
          </Route>
        </Route>

        {/* ---- Catch-all ---- */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/* Convenience: if/when route guards land (protected vs public), define them
 * here so config stays in one file. */

export function RedirectToHome() {
  return <Navigate to="/" replace />;
}

export default AppRoutes;
