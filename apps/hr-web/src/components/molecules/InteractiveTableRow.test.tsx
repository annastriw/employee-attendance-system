import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "@heroui/react";
import { InteractiveTableRow } from "./InteractiveTableRow";

describe("InteractiveTableRow", () => {
  it("opens by row action, leaves nested buttons independent, and supports table keyboard navigation", async () => {
    const onActivate = vi.fn();
    render(<Table><Table.Content aria-label="Uji"><Table.Header><Table.Column isRowHeader>Nama</Table.Column><Table.Column>Aksi</Table.Column></Table.Header>
      <Table.Body><InteractiveTableRow label="Buka data" onActivate={onActivate}>
        <Table.Cell>Isi</Table.Cell><Table.Cell><button type="button" onClick={event => event.stopPropagation()}>Ubah</button></Table.Cell>
      </InteractiveTableRow></Table.Body></Table.Content></Table>);
    fireEvent.click(screen.getByText("Isi"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Ubah" }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    const user = userEvent.setup();
    screen.getByRole("grid", { name: "Uji" }).focus();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});
