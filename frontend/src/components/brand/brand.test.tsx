import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/utils/test-utils';
import { Brand } from './brand';

describe('Brand', () => {
  it('renders the wordmark and an accessible label', () => {
    renderWithProviders(<Brand />);
    expect(screen.getByRole('link', { name: 'TrustFund — home' })).toBeInTheDocument();
    expect(screen.getByText('TrustFund')).toBeInTheDocument();
  });

  it('links home by default and honors a custom destination', () => {
    const { rerender } = renderWithProviders(<Brand to="/impact" />);
    expect(screen.getByRole('link', { name: 'TrustFund — home' })).toHaveAttribute('href', '/impact');
    rerender(<Brand to="/" />);
    expect(screen.getByRole('link', { name: 'TrustFund — home' })).toHaveAttribute('href', '/');
  });

  it('shows the tagline only in the tagline variant', () => {
    const { rerender } = renderWithProviders(<Brand />);
    expect(screen.queryByText('Trusted giving, real impact')).not.toBeInTheDocument();

    rerender(<Brand tagline />);
    expect(screen.getByText('Trusted giving, real impact')).toBeInTheDocument();
  });
});
