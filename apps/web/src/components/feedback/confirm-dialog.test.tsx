import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderDialog(onConfirm: () => Promise<void>) {
  render(
    <ConfirmDialog
      trigger={<Button>Delete project</Button>}
      title="Delete this project?"
      description="This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={onConfirm}
    />,
  );
}

describe("ConfirmDialog", () => {
  it("opens from its trigger and closes on cancel without confirming", async () => {
    const onConfirm = vi.fn(async () => {});
    renderDialog(onConfirm);

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    expect(screen.getByRole("alertdialog", { name: "Delete this project?" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stays open and disabled while confirming, then closes", async () => {
    const pending = deferred();
    renderDialog(() => pending.promise);

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    pending.resolve();
    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("stays open when the action fails so the user can retry or cancel", async () => {
    const pending = deferred();
    renderDialog(() => pending.promise);

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    pending.reject(new Error("Forbidden"));

    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
