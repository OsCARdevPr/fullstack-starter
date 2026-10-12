import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataPagination } from "./data-pagination";

describe("DataPagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(<DataPagination page={1} totalPages={1} onPageChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page and skips distant pages", () => {
    render(<DataPagination page={5} totalPages={10} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
    for (const page of [1, 4, 6, 10]) {
      expect(screen.getByRole("button", { name: `Page ${page}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Page 2" })).not.toBeInTheDocument();
    expect(screen.getAllByText("More pages")).toHaveLength(2);
  });

  it("changes page with the page buttons and previous/next", async () => {
    const onPageChange = vi.fn();
    render(<DataPagination page={2} totalPages={3} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Go to previous page" }));
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));

    expect(onPageChange.mock.calls).toEqual([[3], [1], [3]]);
  });

  it("disables previous on the first page and next on the last", () => {
    const { rerender } = render(<DataPagination page={1} totalPages={2} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Go to previous page" })).toBeDisabled();

    rerender(<DataPagination page={2} totalPages={2} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled();
  });
});
