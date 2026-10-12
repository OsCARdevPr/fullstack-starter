import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { DataTable, type DataTableColumn } from "./data-table";

interface Fruit {
  id: string;
  name: string;
  color: string;
}

const columns: DataTableColumn<Fruit>[] = [
  { id: "name", header: "Name", cell: (fruit) => <strong>{fruit.name}</strong> },
  { id: "color", header: "Color", cell: (fruit) => fruit.color },
];

const fruits: Fruit[] = [
  { id: "1", name: "Apple", color: "red" },
  { id: "2", name: "Banana", color: "yellow" },
];

const getRowId = (fruit: Fruit) => fruit.id;

describe("DataTable", () => {
  it("renders the headers and one row per item using the column cells", () => {
    render(<DataTable columns={columns} rows={fruits} getRowId={getRowId} />);

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText("Apple").tagName).toBe("STRONG");
    expect(within(rows[1] as HTMLElement).getByText("yellow")).toBeInTheDocument();
  });

  it("shows a loading state while the first page loads", () => {
    render(<DataTable columns={columns} rows={undefined} getRowId={getRowId} isLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("shows the error message, the request id and a retry button", async () => {
    const onRetry = vi.fn();
    const error = new ApiError({
      code: "INTERNAL_ERROR",
      status: 500,
      message: "The server failed.",
      requestId: "req-42",
    });
    render(
      <DataTable
        columns={columns}
        rows={undefined}
        getRowId={getRowId}
        error={error}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("The server failed.")).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty content when there are no rows", () => {
    render(
      <DataTable columns={columns} rows={[]} getRowId={getRowId} empty={<p>No fruit yet</p>} />,
    );

    expect(screen.getByText("No fruit yet")).toBeInTheDocument();
  });

  it("falls back to a generic empty state", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={getRowId} />);

    expect(screen.getByText("No results")).toBeInTheDocument();
  });
});
