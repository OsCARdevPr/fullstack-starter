import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FormSwitch } from "./form-switch";
import { useZodForm } from "./use-zod-form";

const schema = z.object({
  emailAlerts: z.boolean().refine((value) => value, "Alerts are required for admins."),
});

function AlertsForm({ onSubmit }: { onSubmit: (values: z.output<typeof schema>) => void }) {
  const form = useZodForm(schema, { defaultValues: { emailAlerts: false } });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormSwitch control={form.control} name="emailAlerts" label="Email alerts" />
      <button type="submit">Save</button>
    </form>
  );
}

describe("FormSwitch", () => {
  it("shows the validation error, then submits true once switched on", async () => {
    const onSubmit = vi.fn();
    render(<AlertsForm onSubmit={onSubmit} />);

    const toggle = screen.getByRole("switch", { name: "Email alerts" });
    expect(toggle).not.toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Alerts are required for admins.")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ emailAlerts: true });
  });
});
