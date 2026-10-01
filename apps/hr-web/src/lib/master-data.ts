import type { AuthClient } from "./auth-client";

export type MasterStatus = "ACTIVE" | "INACTIVE";

export interface MasterRecord {
  id: string;
  name: string;
  code: string;
  status: MasterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MasterRecordPage {
  items: MasterRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MasterRecordQuery {
  search?: string;
  status?: MasterStatus;
  page?: number;
}

export const PAGE_SIZE = 20;

export function masterDataApi(client: Pick<AuthClient, "api">, resource: "departments" | "positions") {
  return {
    list(query: MasterRecordQuery) {
      const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(PAGE_SIZE) });
      if (query.search) params.set("search", query.search);
      if (query.status) params.set("status", query.status);
      return client.api<MasterRecordPage>(`${resource}?${params}`);
    },
    create(input: { name: string; code: string }) {
      return client.api<MasterRecord>(resource, { method: "POST", body: input });
    },
    update(id: string, input: { name: string; code: string }) {
      return client.api<MasterRecord>(`${resource}/${id}`, { method: "PATCH", body: input });
    },
    setStatus(id: string, status: MasterStatus) {
      return client.api<MasterRecord>(`${resource}/${id}/${status === "ACTIVE" ? "activate" : "deactivate"}`, { method: "POST" });
    },
  };
}
