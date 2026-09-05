import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DonationSuccessPage from './donation-success';

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('DonationSuccessPage', () => {
  it('renders success heading', () => {
    render(
      <MemoryRouter initialEntries={['/campaigns/1/donate/success']}>
        <Routes>
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /thank you/i })).toBeInTheDocument();
  });

  it('shows amount and campaign title when state is provided', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/campaigns/1/donate/success',
            state: { donationId: 1, amount: 500, campaignTitle: 'Help Build a School' },
          },
        ]}
      >
        <Routes>
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
    expect(screen.getByText('Help Build a School')).toBeInTheDocument();
  });

  it('shows generic message when no state is provided', () => {
    render(
      <MemoryRouter initialEntries={['/campaigns/1/donate/success']}>
        <Routes>
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/has been received successfully/i)).toBeInTheDocument();
  });

  it('renders navigation actions', () => {
    render(
      <MemoryRouter initialEntries={['/campaigns/1/donate/success']}>
        <Routes>
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /back to campaign/i })).toHaveAttribute(
      'href',
      '/campaigns/1',
    );
    expect(screen.getByRole('link', { name: /discover more campaigns/i })).toHaveAttribute(
      'href',
      '/campaigns',
    );
  });

  it('renders trust note about receipts', () => {
    render(
      <MemoryRouter initialEntries={['/campaigns/1/donate/success']}>
        <Routes>
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/receipts are auto-generated/i)).toBeInTheDocument();
  });

  /* --- Accessibility ------------------------------------------------------ */

  it('has exactly one h1', () => {
    render(
      <MemoryRouter initialEntries={['/campaigns/1/donate/success']}>
        <Routes>
          <Route path="/campaigns/:id/donate/success" element={<DonationSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
  });
});
