import type { UserRole } from '@/types/api';
import { cx } from '@/utils/cx';
import './role-select.css';

export interface RoleSelectProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
}

const ROLES: RoleOption[] = [
  {
    value: 'DONOR',
    label: 'Donor',
    description: 'Support verified charities with transparent donations',
  },
  {
    value: 'CHARITY',
    label: 'Charity',
    description: 'List campaigns and manage your organization',
  },
  {
    value: 'VOLUNTEER',
    label: 'Volunteer',
    description: 'Find and apply to volunteer opportunities',
  },
];

/**
 * RoleSelect — visual role picker with radio-card layout.
 * Each option shows the role name and a short description.
 */
export function RoleSelect({ value, onChange, invalid = false, disabled = false, className }: RoleSelectProps) {
  return (
    <fieldset
      className={cx('role-select', className)}
      aria-invalid={invalid || undefined}
      disabled={disabled}
    >
      <legend className="role-select__legend">I want to</legend>
      <div className="role-select__options" role="radiogroup">
        {ROLES.map((role) => (
          <label
            key={role.value}
            className={cx(
              'role-select__option',
              value === role.value && 'role-select__option--selected',
            )}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={value === role.value}
              onChange={() => onChange(role.value)}
              className="sr-only"
            />
            <span className="role-select__option-label">{role.label}</span>
            <span className="role-select__option-desc">{role.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
