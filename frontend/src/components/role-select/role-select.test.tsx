import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RoleSelect } from './role-select';

describe('RoleSelect', () => {
  it('renders three role options', () => {
    render(<RoleSelect value="DONOR" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /donor/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /charity/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /volunteer/i })).toBeInTheDocument();
  });

  it('marks the selected role as checked', () => {
    render(<RoleSelect value="CHARITY" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /charity/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /donor/i })).not.toBeChecked();
  });

  it('calls onChange when a different role is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoleSelect value="DONOR" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /volunteer/i }));
    expect(onChange).toHaveBeenCalledWith('VOLUNTEER');
  });

  it('disables all radios when disabled prop is true', () => {
    render(<RoleSelect value="DONOR" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('radio', { name: /donor/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /charity/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /volunteer/i })).toBeDisabled();
  });
});
