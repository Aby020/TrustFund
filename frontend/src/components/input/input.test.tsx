import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('is valid (no aria-invalid) by default', () => {
    render(<Input aria-label="Amount" />);
    expect(screen.getByLabelText('Amount')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Amount')).toHaveClass('input');
  });

  it('sets aria-invalid when flagged invalid', () => {
    render(<Input aria-label="Amount" invalid />);
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
  });

  it('supports the large size variant', () => {
    render(<Input aria-label="Search" sizeVariant="lg" />);
    expect(screen.getByLabelText('Search')).toHaveClass('input--lg');
  });
});