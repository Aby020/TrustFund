import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Dropdown, DropdownItem, DropdownSeparator } from './dropdown';

function renderMenu() {
  return render(
    <Dropdown label="Actions">
      <DropdownItem onClick={onSelect}>Settings</DropdownItem>
      <DropdownSeparator />
      <DropdownItem destructive>Delete</DropdownItem>
    </Dropdown>,
  );
}

const onSelect = vi.fn();

describe('Dropdown', () => {
  beforeEach(() => {
    onSelect.mockClear();
  });

  it('starts closed with correct trigger semantics', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Actions/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click and exposes menu + items', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Actions/ }));

    const trigger = screen.getByRole('button', { name: /Actions/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('selects an item: runs onClick and closes the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Actions/ }));

    await user.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Actions/ });
    await user.click(trigger);

    // Focus a menu item so Escape bubbles to the menu's key handler.
    screen.getByRole('menuitem', { name: 'Settings' }).focus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('applies the destructive treatment to flagged items', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Actions/ }));
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveClass(
      'dropdown__item--danger',
    );
  });
});