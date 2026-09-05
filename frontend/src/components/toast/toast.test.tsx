import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ToastProvider, useToast } from './toast';

function Page() {
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() => toast.show({ title: 'Saved', description: 'All good.', tone: 'success', duration: 0 })}
      >
        Notify
      </button>
      <button type="button" onClick={() => toast.error('Import failed', 'Try again.')}>
        Fail
      </button>
    </>
  );
}

describe('Toast', () => {
  it('renders a success toast in a polite status region', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Notify' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved');
    expect(status).toHaveTextContent('All good.');
  });

  it('renders errors as alerts (assertive) with the danger tone', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Fail' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Import failed');
    expect(alert).toHaveClass('toast--error');
  });

  it('dismisses a toast via its close button', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Notify' }));
    const status = await screen.findByRole('status');

    await user.click(within(status).getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('does not stack identical duplicate toasts', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Fail' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Fail' }));

    // Two identical error submissions render ONE visible alert.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('still stacks distinct toasts', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Fail' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    await screen.findByRole('status');

    expect(screen.getByRole('alert')).toHaveTextContent('Import failed');
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('throws when used outside the provider', () => {
    // Silence the expected React error boundary/console noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      function Broken() {
        useToast();
        return null;
      }
      render(<Broken />);
    }).toThrow('useToast must be used within <ToastProvider>.');
    spy.mockRestore();
  });
});