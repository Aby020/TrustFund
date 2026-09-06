import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HowItWorksPage from './how-it-works';

function renderPage() {
  return render(
    <MemoryRouter>
      <HowItWorksPage />
    </MemoryRouter>,
  );
}

describe('HowItWorksPage', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/transparent giving/i);
  });

  it('explains the flow for donors', () => {
    renderPage();
    expect(screen.getByText('For donors')).toBeInTheDocument();
    expect(screen.getByText('Give with confidence')).toBeInTheDocument();
    // Real donor steps: discover, donate, receipt, follow impact.
    expect(screen.getByText('Donate securely')).toBeInTheDocument();
    expect(screen.getByText('Get a receipt')).toBeInTheDocument();
  });

  it('explains the flow for verified charities', () => {
    renderPage();
    expect(screen.getByText('For verified charities')).toBeInTheDocument();
    expect(screen.getByText('Raise funds the trusted way')).toBeInTheDocument();
    expect(screen.getByText('Get verified')).toBeInTheDocument();
    expect(screen.getByText('Publish campaigns')).toBeInTheDocument();
  });

  it('explains the flow for volunteers', () => {
    renderPage();
    expect(screen.getByText('For volunteers')).toBeInTheDocument();
    expect(screen.getByText('Lend your time where it counts')).toBeInTheDocument();
    expect(screen.getByText('Find opportunities')).toBeInTheDocument();
    expect(screen.getByText('Get approved')).toBeInTheDocument();
  });

  it('reuses the four-step trust stepper from the landing page', () => {
    renderPage();
    // "Giving that earns trust, step by step" is the landing stepper's heading.
    expect(screen.getByText(/giving that earns trust/i)).toBeInTheDocument();
  });

  it('provides public calls to action', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /browse campaigns/i })).toHaveAttribute('href', '/campaigns');
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/auth/register');
  });

  it('offers per-audience calls to action', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /register your charity/i })).toHaveAttribute('href', '/auth/register');
    expect(screen.getByRole('link', { name: /join as a volunteer/i })).toHaveAttribute('href', '/auth/register');
  });
});