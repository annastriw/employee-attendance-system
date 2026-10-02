import type { AuthClient } from './auth-client';
import type { MasterRecord, MasterRecordPage } from './master-data';
export interface EmployeeInput { nik: string; name: string; phone?: string; email: string; departmentId: string; positionId: string; startDate: string; status: 'ACTIVE' | 'INACTIVE' }
export interface EmployeeRecord extends Omit<EmployeeInput, 'departmentId' | 'positionId'> { id: string; department: string; position: string }
export interface EmployeePage { items: EmployeeRecord[]; total: number; page: number; pageSize: number }
export interface ProvisioningOperation { id: string; employeeId: string; status: 'PENDING' | 'COMPLETED' | 'FAILED'; errorCode: string | null; email: string; canCorrectEmail?: boolean }
export interface TemporaryCredential { email: string; temporaryPassword: string }
export async function loadActiveMasters(client: Pick<AuthClient, 'api'>, resource: 'departments' | 'positions'): Promise<MasterRecord[]> {
  const records: MasterRecord[] = []; let page = 1;
  while (true) {
    const result = await client.api<MasterRecordPage>(resource + '?status=ACTIVE&pageSize=100&page=' + page);
    records.push(...result.items.filter(row => row.status === 'ACTIVE'));
    if (page * result.pageSize >= result.total) return records;
    if (!result.items.length || page >= 1000) throw new Error('Pilihan master belum selesai dimuat. Coba lagi.');
    page++;
  }
}

export interface EmailChangeOperation { id: string; employeeId: string; email: string; status: 'PENDING' | 'COMPLETED' | 'FAILED'; errorCode: string | null }
export interface EmployeeDetail extends Omit<EmployeeInput, 'status' | 'phone'> {
  phone: string | null; status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  id: string; department: MasterRecord; position: MasterRecord;
  updatedAt: string; emailChange: EmailChangeOperation | null;
}