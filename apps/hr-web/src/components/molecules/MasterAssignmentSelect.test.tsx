import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MasterAssignmentSelect } from './MasterAssignmentSelect';
import type { MasterRecord } from '../../lib/master-data';
const active: MasterRecord = { id: 'active', name: 'Analis', code: 'ANL', status: 'ACTIVE', createdAt: '', updatedAt: '' };
const inactive: MasterRecord = { ...active, id: 'inactive', name: 'Supervisor', status: 'INACTIVE' };
describe.each(['Departemen', 'Jabatan'] as const)('%s assignment', label => {
  it('offers only active records and returns their ID', async () => {
    const onChange = vi.fn(); const user = userEvent.setup();
    render(<MasterAssignmentSelect label={label} records={[active, inactive]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: `Pilih ${label.toLowerCase()}` }));
    expect(screen.queryByRole('menuitemradio', { name: 'Supervisor' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('menuitemradio', { name: 'Analis' }));
    expect(onChange).toHaveBeenCalledWith('active');
  });
  it('explains an inactive old value without offering it for a new assignment', async () => {
    const user = userEvent.setup();
    render(<MasterAssignmentSelect label={label} records={[active, inactive]} current={inactive} onChange={vi.fn()} />);
    expect(screen.getByText(/Supervisor sudah nonaktif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Pilih ${label.toLowerCase()}` }));
    expect(screen.queryByRole('menuitemradio', { name: 'Supervisor' })).not.toBeInTheDocument();
  });
  it('disables assignment when no active master exists', () => {
    render(<MasterAssignmentSelect label={label} records={[inactive]} onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
