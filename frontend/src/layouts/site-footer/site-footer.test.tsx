import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/utils/test-utils';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('renders branding and the trust line', () => {
    renderWithProviders(<SiteFooter />);

    expect(screen.getByRole('link', { name: 'TrustFund — home' })).toBeInTheDocument();
    expect(screen.getByText(/every rupee is tracked from donation to impact/i)).toBeInTheDocument();
  });

  it('renders the navigation group with only real destinations', () => {
    renderWithProviders(<SiteFooter />);

    const groups = screen.getAllByRole('navigation', { name: 'Footer' });
    expect(groups).toHaveLength(1);

    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument();

    // Every footer link must point to a real, functional public route.
    expect(screen.getByRole('link', { name: 'Discover campaigns' })).toHaveAttribute('href', '/campaigns');
    expect(screen.getByRole('link', { name: 'Charities' })).toHaveAttribute('href', '/charities');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/how-it-works');

    // Placeholders with no route/pages yet must not be presented as links.
    expect(screen.queryByRole('heading', { name: 'Get involved' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Trust & safety' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volunteer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Privacy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Terms' })).not.toBeInTheDocument();
  });

  it('shows the current year in the copyright bar', () => {
    const year = String(new Date().getFullYear());
    renderWithProviders(<SiteFooter />);
    expect(screen.getByText(new RegExp(`© ${year} TrustFund`))).toBeInTheDocument();
  });
});
