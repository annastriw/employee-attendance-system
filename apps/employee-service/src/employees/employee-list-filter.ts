export interface EmployeeListFilterQuery {
  status?: "ACTIVE" | "INACTIVE";
  departmentId?: string;
  positionId?: string;
  search?: string;
}

export function employeeListFilter(query: EmployeeListFilterQuery) {
  return {
    ready: true as const,
    provisioning: { status: "COMPLETED" as const },
    ...(query.status ? { status: query.status } : {}),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.positionId ? { positionId: query.positionId } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search } }, { nik: { contains: query.search } }] }
      : {}),
  };
}
