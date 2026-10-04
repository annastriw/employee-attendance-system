import { NotFoundException } from '@nestjs/common';
import { EmployeeProfileService } from './employee-profile.service';

describe('EmployeeProfileService.myProfile', () => {
  const findUnique = jest.fn();
  const service = new EmployeeProfileService({ client: { empEmployee: { findUnique } } } as never);
  beforeEach(() => findUnique.mockReset());

  it('returns null data for an HR account without an employee record', async () => {
    await expect(service.myProfile(null)).resolves.toEqual({ data: null });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns only the signed-in employee profile fields', async () => {
    findUnique.mockResolvedValue({
      id: 'emp-1', name: 'Ayu', nik: 'NIK-1', accountEmail: 'ayu@example.test', phone: '0812',
      startDate: new Date('2022-03-01T00:00:00Z'), status: 'ACTIVE', ready: true,
      department: { name: 'Engineering' }, position: { name: 'Developer' },
      provisioning: { status: 'COMPLETED', email: 'provision@example.test' },
    });
    await expect(service.myProfile('emp-1')).resolves.toEqual({ data: {
      id: 'emp-1', name: 'Ayu', nik: 'NIK-1', email: 'ayu@example.test', phone: '0812',
      department: 'Engineering', position: 'Developer', startDate: '2022-03-01', status: 'ACTIVE',
    } });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'emp-1' } }));
  });

  it('does not expose incomplete provisioning records', async () => {
    findUnique.mockResolvedValue({ ready: false, provisioning: { status: 'PENDING' } });
    await expect(service.myProfile('emp-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
