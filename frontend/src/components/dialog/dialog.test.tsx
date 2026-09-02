import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Dialog } from './dialog';

describe('Dialog', () => {
  it('stays closed (no open attribute) until open is true', () => {
    render(
      <Dialog open={false} title="Confirm" onClose={vi.fn()}>
        Secret body
      </Dialog>,
    );
    const dialogEl = document.body.querySelector('dialog') as HTMLDialogElement;
    expect(dialogEl).not.toHaveAttribute('open');
  });

  it('opens the native dialog when open (jsdom fallback sets the attribute)', () => {
    render(
      <Dialog open title="Confirm deletion" onClose={vi.fn()}>
        Body text here
      </Dialog>,
    );
    const dialogEl = screen.getByText('Body text here').closest('dialog') as HTMLDialogElement;
    expect(dialogEl).toHaveAttribute('open');
    expect(screen.getByText('Confirm deletion')).toBeInTheDocument();
    expect(screen.getByText('Body text here')).toBeInTheDocument();
  });

  it('closes via the header close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open title="Confirm" onClose={onClose}>
        Body
      </Dialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('routes the native cancel event (Esc) to onClose', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Confirm" onClose={onClose}>
        Body
      </Dialog>,
    );
    const dialogEl = screen.getByText('Body').closest('dialog') as HTMLDialogElement;
    dialogEl.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders description and footer when provided', () => {
    render(
      <Dialog
        open
        title="Confirm"
        description="A short explanation."
        footer={<button type="button">Proceed</button>}
        onClose={vi.fn()}
      >
        Body
      </Dialog>,
    );
    expect(screen.getByText('A short explanation.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Proceed' })).toBeInTheDocument();
  });
});