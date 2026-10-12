import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FormCheckbox } from "./form-checkbox";
import { useZodForm } from "./use-zod-form";

const schema = z.object({
  acceptTerms: z.boolean().refine((value) => value, "Accept the terms to continue."),
});

function TermsForm({ onSubmit }: { onSubmit: (values: z.output<typeof schema>) => void }) {
  const form = useZodForm(schema, { defaultValues: { acceptTerms: false } });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormCheckbox
        control={form.control}
        name="acceptTerms"
        label="I accept the terms"
        description="Required to create an account."
      />
      <button type="submit">Save</button>
    </form>
  );
}

describe("FormCheckbox", () => {
  it("shows the validation error, then submits true once checked", async () => {
    const onSubmit = vi.fn();
    render(<TermsForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Accept the terms to continue.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    const checkbox = screen.getByRole("checkbox", { name: "I accept the terms" });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Required to create an account.")).toBeInTheDocument();

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ acceptTerms: true });
    expect(screen.queryByText("Accept the terms to continue.")).not.toBeInTheDocument();
  });
});
