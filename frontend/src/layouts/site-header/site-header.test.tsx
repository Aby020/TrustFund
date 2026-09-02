import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/utils/test-utils';
import { SiteHeader } from './site-header';

function getPanel() {
  return document.getElementById('site-mobile-nav') as HTMLElement;
}

describe('SiteHeader', () => {
  it('renders the brand, primary nav, and anonymous auth actions', () => {
    renderWithProviders(<SiteHeader />);

    expect(screen.getByRole('link', { name: 'TrustFund — home' })).toBeInTheDocument();

    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(primary).getByRole('link', { name: 'Campaigns' })).toBeInTheDocument();
    expect(within(primary).getByRole('link', { name: 'Charities' })).toBeInTheDocument();
    expect(within(primary).getByRole('link', { name: 'How it works' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Donate' })).toBeInTheDocument();
  });

  it('hides the mobile panel (inert + aria-hidden) while closed', () => {
    renderWithProviders(<SiteHeader />);
    const panel = getPanel();
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveAttribute('inert');
  });

  it('opens the mobile menu from the toggle and manages aria-expanded', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SiteHeader />);

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'site-mobile-nav');

    await user.click(toggle);

    const panel = getPanel();
    expect(panel).not.toHaveAttribute('aria-hidden');
    expect(panel).not.toHaveAttribute('inert');
    expect(panel.classList.contains('is-open')).toBe(true);

    const closeToggle = screen.getByRole('button', { name: 'Close menu' });
    expect(closeToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('link', { name: 'Campaigns' })).toBeInTheDocument();
  });

  it('closes the mobile menu on Escape and restores aria-expanded', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SiteHeader />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(getPanel().classList.contains('is-open')).toBe(true);

    await user.keyboard('{Escape}');

    expect(getPanel().classList.contains('is-open')).toBe(false);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the mobile menu when a navigation link is chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SiteHeader />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(within(getPanel()).getByRole('link', { name: 'Campaigns' }));

    expect(getPanel().classList.contains('is-open')).toBe(false);
  });
});
