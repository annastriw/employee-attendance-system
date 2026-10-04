import { employeeListFilter } from './employee-list-filter';

describe('employee master filters', () => {
  it('applies the same assignment predicates to results and total without dropping readiness', () => {
    const where = employeeListFilter({ departmentId: 'department-id', positionId: 'position-id', search: 'Sari', status: 'ACTIVE' });
    expect(where).toEqual({ ready: true, provisioning: { status: 'COMPLETED' }, departmentId: 'department-id', positionId: 'position-id', status: 'ACTIVE', OR: [{ name: { contains: 'Sari' } }, { nik: { contains: 'Sari' } }] });
  });
  it('leaves assignment predicates absent for an unfiltered list', () => {
    expect(employeeListFilter({})).toEqual({ ready: true, provisioning: { status: 'COMPLETED' } });
  });
});
