import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { formatDate } from "@/lib/format";
import { FormDatePicker } from "./form-date-picker";
import { useZodForm } from "./use-zod-form";

const schema = z.object({ dueDate: z.date({ error: "Pick a due date." }) });

const today = new Date();
const firstAllowed = new Date(today.getFullYear(), today.getMonth(), 10);

function DueDateForm({ onSubmit }: { onSubmit: (values: z.output<typeof schema>) => void }) {
  const form = useZodForm(schema, { defaultValues: { dueDate: undefined } });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormDatePicker
        control={form.control}
        name="dueDate"
        label="Due date"
        placeholder="Pick a date"
        disabledDates={{ before: firstAllowed }}
      />
      <button type="submit">Save</button>
    </form>
  );
}

/** The calendar labels each day with its long date ("Thursday, January 15th, 2026"). */
function dayButton(date: Date) {
  return screen.getByRole("button", { name: new RegExp(format(date, "PPPP")) });
}

describe("FormDatePicker", () => {
  it("shows the validation error, then submits the picked date", async () => {
    const onSubmit = vi.fn();
    render(<DueDateForm onSubmit={onSubmit} />);

    const trigger = screen.getByRole("button", { name: "Due date" });
    expect(trigger).toHaveTextContent("Pick a date");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Pick a due date.")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(trigger);
    const picked = new Date(today.getFullYear(), today.getMonth(), 15);
    expect(dayButton(new Date(today.getFullYear(), today.getMonth(), 5))).toBeDisabled();
    await userEvent.click(dayButton(picked));

    await vi.waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent(formatDate(picked));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ dueDate: picked });
  });
});
