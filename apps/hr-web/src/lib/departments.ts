import type { AuthClient } from "./auth-client";

export type MasterStatus = "ACTIVE" | "INACTIVE";

export interface Department {
  id: string;
  name: string;
  code: string;
  status: MasterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentPage {
  items: Department[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DepartmentQuery {
  search?: string;
  status?: MasterStatus;
  page?: number;
}

export const PAGE_SIZE = 20;

export function departmentsApi(client: Pick<AuthClient, "api">) {
  return {
    list(query: DepartmentQuery) {
      const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(PAGE_SIZE) });
      if (query.search) params.set("search", query.search);
      if (query.status) params.set("status", query.status);
      return client.api<DepartmentPage>(`departments?${params}`);
    },
    create(input: { name: string; code: string }) {
      return client.api<Department>("departments", { method: "POST", body: input });
    },
    update(id: string, input: { name: string; code: string }) {
      return client.api<Department>(`departments/${id}`, { method: "PATCH", body: input });
    },
    setStatus(id: string, status: MasterStatus) {
      return client.api<Department>(`departments/${id}/${status === "ACTIVE" ? "activate" : "deactivate"}`, { method: "POST" });
    },
  };
}
