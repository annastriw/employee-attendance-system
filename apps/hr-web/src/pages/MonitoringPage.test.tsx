import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitoringPage } from "./MonitoringPage";
import type {
  MonitoringEmployeesResult,
  MonitoringSummary,
} from "../lib/monitoring";

describe("MonitoringPage (Layar H02 Monitoring & Rekap)", () => {
  beforeEach(() => {
    // Keep the fixture historical regardless of the runner's real calendar.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T05:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockSummary: MonitoringSummary = {
    date: "2026-10-05",
    isWorkday: true,
    scheduleType: "REGULAR_WORKDAY",
    workPolicy: {
      checkInTime: "08:00:00",
      checkOutTime: "17:00:00",
    },
    activeEmployees: 5,
    checkedIn: 3,
    late: 1,
    earlyDeparture: 1,
    pendingCheckout: 1,
    completed: 2,
    missingAttendance: 1,
    deletedCount: 1,
  };

  const mockEmployees: MonitoringEmployeesResult = {
    data: [
      {
        employeeId: "emp-1",
        nik: "EMP-001",
        name: "Aditya Pratama",
        departmentId: "dept-1",
        department: "Teknologi Informasi",
        positionId: "pos-1",
        position: "Software Engineer",
        attendanceDate: "2026-10-05",
        status: "COMPLETED",
        isLate: true,
        isEarlyDeparture: false,
        checkInTime: "2026-10-05T08:15:00+07:00",
        checkOutTime: "2026-10-05T17:00:00+07:00",
        recordId: "rec-1",
        deletedAt: null,
      },
      {
        employeeId: "emp-2",
        nik: "EMP-002",
        name: "Budi Santoso",
        departmentId: "dept-1",
        department: "Teknologi Informasi",
        positionId: "pos-1",
        position: "Frontend Engineer",
        attendanceDate: "2026-10-05",
        status: "CHECKED_IN",
        isLate: false,
        isEarlyDeparture: false,
        checkInTime: "2026-10-05T07:55:00+07:00",
        checkOutTime: null,
        recordId: "rec-2",
        deletedAt: null,
      },
      {
        employeeId: "emp-3",
        nik: "EMP-003",
        name: "Citra Dewi",
        departmentId: "dept-2",
        department: "Sumber Daya Manusia",
        positionId: "pos-2",
        position: "HR Specialist",
        attendanceDate: "2026-10-05",
        status: "MISSING",
        isLate: false,
        isEarlyDeparture: false,
        checkInTime: null,
        checkOutTime: null,
        recordId: null,
        deletedAt: null,
      },
      {
        employeeId: "emp-4",
        nik: "EMP-004",
        name: "Doni Firmansyah",
        departmentId: "dept-2",
        department: "Sumber Daya Manusia",
        positionId: "pos-2",
        position: "Recruiter",
        attendanceDate: "2026-10-05",
        status: "DELETED",
        isLate: false,
        isEarlyDeparture: false,
        checkInTime: "2026-10-05T08:00:00+07:00",
        checkOutTime: null,
        recordId: "rec-4",
        deletedAt: "2026-10-05T10:00:00+07:00",
      },
    ],
    meta: {
      total: 4,
      page: 1,
      pageSize: 20,
      date: "2026-10-05",
    },
  };

  const mockDepartments = { total: 2, page: 1, pageSize: 100,
    items: [
      { id: "dept-1", name: "Teknologi Informasi" },
      { id: "dept-2", name: "Sumber Daya Manusia" },
    ],
  };

  function setup(params = "date=2026-10-05") {
    const api = vi.fn(async (url: string) => {
      if (url.startsWith("departments")) {
        return mockDepartments;
      }
      if (url.startsWith("monitoring/summary")) {
        return { data: mockSummary };
      }
      if (url.startsWith("monitoring/trend")) {
        return { data: [
          { date: "2026-10-01", present: 3, late: 1, absent: 1, scheduleType: "REGULAR_WORKDAY", holiday: null },
          { date: "2026-10-02", present: 4, late: 0, absent: 0, scheduleType: "REGULAR_WORKDAY", holiday: null },
        ] };
      }
      if (url.startsWith("monitoring/employees")) {
        return mockEmployees;
      }
      throw new Error("Unknown URL: " + url);
    });
    const onParamsChange = vi.fn();
    const onSessionExpired = vi.fn();
    const user = userEvent.setup();
    const rendered = render(
      <MemoryRouter>
        <MonitoringPage
          client={{ api: api as never }}
          params={new URLSearchParams(params)}
          onParamsChange={onParamsChange}
          onSessionExpired={onSessionExpired}
        />
      </MemoryRouter>,
    );
    return { api, onParamsChange, onSessionExpired, user, rendered };
  }

  it("renders metric cards and employee attendance table with accurate statuses", async () => {
    setup();

    // Wait for summary and table to load
    await waitFor(() => {
      expect(screen.getByText("Karyawan Aktif")).toBeInTheDocument();
      expect(screen.getByText("Aditya Pratama")).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.getByText("Citra Dewi")).toBeInTheDocument();
      expect(screen.getByText("Doni Firmansyah")).toBeInTheDocument();
    });

    // Check metric card values
    expect(screen.getAllByText("5")[0]).toBeInTheDocument(); // activeEmployees
    expect(screen.getByText("3")).toBeInTheDocument(); // checkedIn

    // Check badges
    expect(screen.getAllByText("Terlambat").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Selesai").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tidak ada absensi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dihapus HRD").length).toBeGreaterThan(0);

    // Check action link for existing record
    const viewLinks = screen.getAllByRole("link", { name: /Lihat/i });
    expect(viewLinks.length).toBe(3); // emp-1, emp-2, emp-4
    expect(viewLinks[0]).toHaveAttribute("href", "/absensi?id=rec-1");
  });

  it("opens inline employee details and links to attendance evidence", async () => {
    const { user } = setup();
    await screen.findByText("Karyawan Aktif");
    await user.click(await screen.findByRole("row", { name: /Aditya Pratama/ }));
    expect(await screen.findByRole("dialog", { name: "Detail Aditya Pratama" })).toBeInTheDocument();
    const detail = screen.getByRole("dialog", { name: "Detail Aditya Pratama" });
    expect(detail).toHaveTextContent("Teknologi Informasi");
    expect(within(detail).getByRole("link", { name: /Buka detail absensi/i })).toHaveAttribute("href", "/absensi?id=rec-1");
    await user.click(screen.getByRole("button", { name: "Tutup detail" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Detail Aditya Pratama" })).not.toBeInTheDocument());
    await user.click(await screen.findByRole("row", { name: /Citra Dewi/ }));
    expect(await screen.findByRole("dialog", { name: "Detail Citra Dewi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka profil karyawan" })).toHaveAttribute("href", "/karyawan?employee=emp-3");
  });

  it("opens an employee row with the keyboard on desktop and mobile layouts", async () => {
    const { user } = setup();
    await screen.findByText("Karyawan Aktif");
    const row = await screen.findByRole("row", { name: /Aditya Pratama/ });
    row.focus();
    await user.keyboard(" ");
    expect(await screen.findByRole("dialog", { name: "Detail Aditya Pratama" })).toBeInTheDocument();
  });

  it("shows the pending-release fallback when the trend endpoint is unavailable", async () => {
    const api = vi.fn(async (url: string) => {
      if (url.startsWith("departments")) return mockDepartments;
      if (url.startsWith("monitoring/summary")) return { data: mockSummary };
      if (url.startsWith("monitoring/employees")) return mockEmployees;
      if (url.startsWith("monitoring/trend")) throw new (await import("../lib/auth-client")).AuthError(404, "Tidak ditemukan");
      throw new Error("Unknown URL: " + url);
    });
    render(<MemoryRouter><MonitoringPage client={{ api: api as never }} params={new URLSearchParams("date=2026-10-05")} onParamsChange={vi.fn()} onSessionExpired={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText("Grafik tren tersedia setelah rilis backend")).toBeInTheDocument();
    expect(screen.getByText(/Komposisi/)).toBeInTheDocument();
  });

  it("clicking metric card triggers status filtering", async () => {
    const { onParamsChange, user } = setup();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Total Terlambat" }),
      ).toBeInTheDocument();
    });

    const lateCard = screen.getByRole("button", { name: "Total Terlambat" });
    await user.click(lateCard);

    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-10-05",
        status: "LATE",
      }),
    );
  });

  it("keeps today's date implicit when filtering status", async () => {
    vi.setSystemTime(new Date("2026-10-04T18:00:00Z")); // Oct 5 in Jakarta.
    const { onParamsChange, user } = setup();

    await user.click(
      await screen.findByRole("button", { name: "Total Terlambat" }),
    );

    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({ date: undefined, status: "LATE" }),
    );
  });

  it("navigates date using previous and next day buttons", async () => {
    const { onParamsChange, user } = setup();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hari sebelumnya" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Hari sebelumnya" }));
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-10-04",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Hari berikutnya" }));
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-10-06",
      }),
    );
  });

  it("filters by department dropdown", async () => {
    const { onParamsChange, user } = setup();

    await user.click(await screen.findByRole("button", { name: "Buka filter" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Filter Departemen")).toBeInTheDocument();
    });

    const deptSelect = screen.getByLabelText("Filter Departemen");
    await user.click(deptSelect);
    await user.click(await screen.findByRole("menuitemradio", { name: "Teknologi Informasi" }));

    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-10-05",
        departmentId: "dept-1",
      }),
    );
  });

  it("debounces search for employee name or NIK", async () => {
    const { onParamsChange, user } = setup();

    await waitFor(() => {
      expect(screen.getByLabelText("Cari nama atau NIK")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Cari nama atau NIK");
    await user.type(searchInput, "Aditya");

    await waitFor(() => expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-10-05",
        search: "Aditya",
      }),
    ));
  });
});
