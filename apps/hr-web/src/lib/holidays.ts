import type { AuthClient } from './auth-client';

export interface HolidayRecord {
  id: string;
  holidayDate: string; // YYYY-MM-DD
  description: string;
  isPast: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayPage {
  data: HolidayRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  items?: HolidayRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface HolidayQuery {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const holidaysApi = (client: Pick<AuthClient, 'api'>) => ({
  list(query: HolidayQuery = {}) {
    const params = new URLSearchParams();
    if (query.year) params.set('year', String(query.year));
    if (query.month) params.set('month', String(query.month));
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return client.api<HolidayPage>(`holidays${qs}`);
  },

  get(id: string) {
    return client.api<{ data: HolidayRecord }>(`holidays/${id}`);
  },

  create(input: { holidayDate: string; description: string }) {
    return client.api<{ data: HolidayRecord }>('holidays', {
      method: 'POST',
      body: input,
    });
  },

  update(id: string, input: { holidayDate?: string; description?: string }) {
    return client.api<{ data: HolidayRecord }>(`holidays/${id}`, {
      method: 'PATCH',
      body: input,
    });
  },

  delete(id: string) {
    return client.api<{ data: { id: string; message: string } }>(`holidays/${id}`, {
      method: 'DELETE',
    });
  },
});
