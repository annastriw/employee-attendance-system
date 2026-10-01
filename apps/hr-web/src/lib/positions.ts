import type { AuthClient } from './auth-client';
import { masterDataApi } from './master-data';
export type { MasterRecord as Position } from './master-data';
export const positionsApi = (client: Pick<AuthClient, 'api'>) => masterDataApi(client, 'positions');
