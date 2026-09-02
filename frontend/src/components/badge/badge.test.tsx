import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders neutral by default', () => {
    render(<Badge>Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('badge', 'badge--neutral');
  });

  it('applies the requested tone class', () => {
    render(<Badge tone="danger">Rejected</Badge>);
    expect(screen.getByText('Rejected')).toHaveClass('badge--danger');
  });

  it('renders a status dot when asked', () => {
    render(
      <Badge tone="success" dot>
        Verified
      </Badge>,
    );
    const badge = screen.getByText('Verified');
    expect(badge.querySelector('.badge__dot')).toBeInTheDocument();
  });
});