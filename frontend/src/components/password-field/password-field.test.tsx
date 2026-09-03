import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from './password-field';

describe('PasswordField', () => {
  it('renders a password input by default', () => {
    const { container } = render(<PasswordField />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles to text on button click', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordField />);
    const input = container.querySelector('input')!;

    // Initially password
    expect(input).toHaveAttribute('type', 'password');

    // Click toggle
    const toggle = screen.getByRole('button', { name: /show password/i });
    await user.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to password on second click', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordField />);
    const input = container.querySelector('input')!;

    const toggle = screen.getByRole('button', { name: /show password/i });
    await user.click(toggle); // → text
    await user.click(toggle); // → password

    expect(input).toHaveAttribute('type', 'password');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<PasswordField ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('sets aria-invalid when invalid prop is true', () => {
    const { container } = render(<PasswordField invalid />);
    const input = container.querySelector('input')!;
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
