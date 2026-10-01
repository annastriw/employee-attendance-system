import type { AuthClient } from './auth-client';
import { masterDataApi } from './master-data';
export { PAGE_SIZE } from './master-data';
export type { MasterStatus, MasterRecord as Department, MasterRecordPage as DepartmentPage, MasterRecordQuery as DepartmentQuery } from './master-data';
export const departmentsApi = (client: Pick<AuthClient, 'api'>) => masterDataApi(client, 'departments');
