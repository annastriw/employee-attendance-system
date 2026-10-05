import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle, WorkspaceAccountMenu } from '@attendance/ui';

beforeEach(() => localStorage.clear());
describe('Workspace controls shared across roles', () => {
  it('keeps desktop and drawer theme controls synchronized in the same tab', async () => {
    render(<><ThemeToggle /><ThemeToggle showLabel placement="top start" /></>);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: /Pilih tema/ })[1]);
    await user.click(await screen.findByRole('menuitemradio', { name: 'Gelap' }));
    expect(screen.getAllByRole('button', { name: 'Pilih tema: Gelap' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: /Pilih tema/ })[0]);
    await user.click(await screen.findByRole('menuitemradio', { name: 'Sistem' }));
    expect(screen.getAllByRole('button', { name: 'Pilih tema: Sistem' })).toHaveLength(2);
    expect(localStorage.getItem('theme')).toBeNull();
  });
  it('opens theme options on demand, selects and persists the preference', async () => {
    render(<ThemeToggle />);
    const user = userEvent.setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Pilih tema/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Gelap' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Pilih tema: Gelap' })).toBeInTheDocument();
  });
  it('displays profile name and email before opening the menu and clears stale identity on account change', async () => {
    const client = { api: vi.fn().mockResolvedValue({ data: { name: 'Sari' } }) };
    const props = { client, busy: false, onLogout: vi.fn(), onProfile: vi.fn(), email: 'sari@example.test', roleLabel: 'Karyawan' };
    const { rerender } = render(<WorkspaceAccountMenu {...props} />);
    expect(await screen.findByText('Sari')).toBeInTheDocument();
    expect(screen.getByText('sari@example.test')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    client.api.mockResolvedValue({ data: null });
    rerender(<WorkspaceAccountMenu {...props} email="hr@example.test" roleLabel="Admin HRD" />);
    expect(screen.queryByText('Sari')).not.toBeInTheDocument();
    expect(screen.getByText('Admin HRD')).toBeInTheDocument();
    await waitFor(() => expect(client.api).toHaveBeenCalledTimes(2));
  });
  it('expires the session when identity lookup is unauthorized', async () => {
    const onSessionExpired = vi.fn();
    render(<WorkspaceAccountMenu email="hr@example.test" busy={false} onLogout={vi.fn()} onProfile={vi.fn()}
      client={{ api: vi.fn().mockRejectedValue({ status: 401 }) }} onSessionExpired={onSessionExpired} />);
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledOnce());
  });
});
