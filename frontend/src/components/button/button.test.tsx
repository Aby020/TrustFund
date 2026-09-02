import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders with default (primary, md) styles', () => {
    render(<Button>Donate</Button>);
    const button = screen.getByRole('button', { name: 'Donate' });
    expect(button).toHaveClass('button', 'button--primary', 'button--md');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="outline" size="lg">
        Submit
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveClass(
      'button--outline',
      'button--lg',
    );
  });

  it('disables interaction and signals busy while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: /Save/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    // The inline spinner exposes a polite status live region.
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('invokes onClick on activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is a type="button" by default so forms are not submitted accidentally', () => {
    render(<Button>No submit</Button>);
    expect(screen.getByRole('button', { name: 'No submit' })).toHaveAttribute('type', 'button');
  });
});