import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/utils/test-utils';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('renders branding and the trust line', () => {
    renderWithProviders(<SiteFooter />);

    expect(screen.getByRole('link', { name: 'TrustFund — home' })).toBeInTheDocument();
    expect(screen.getByText(/every rupee is tracked from donation to impact/i)).toBeInTheDocument();
  });

  it('renders the navigation groups and their links', () => {
    renderWithProviders(<SiteFooter />);

    const groups = screen.getAllByRole('navigation', { name: 'Footer' });
    expect(groups).toHaveLength(1);

    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Get involved' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trust & safety' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Discover campaigns' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volunteer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument();
  });

  it('shows the current year in the copyright bar', () => {
    const year = String(new Date().getFullYear());
    renderWithProviders(<SiteFooter />);
    expect(screen.getByText(new RegExp(`© ${year} TrustFund`))).toBeInTheDocument();
  });
});
