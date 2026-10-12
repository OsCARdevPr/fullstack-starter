import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FormCombobox } from "./form-combobox";
import { useZodForm } from "./use-zod-form";

const schema = z.object({ country: z.string().min(1, "Choose a country.") });

const countries = [
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "sv", label: "El Salvador" },
];

function CountryForm({ onSubmit }: { onSubmit: (values: z.output<typeof schema>) => void }) {
  const form = useZodForm(schema, { defaultValues: { country: "" } });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormCombobox
        control={form.control}
        name="country"
        label="Country"
        options={countries}
        placeholder="Select a country"
        emptyText="No country found."
      />
      <button type="submit">Save</button>
    </form>
  );
}

describe("FormCombobox", () => {
  it("shows the validation error, then submits the option picked by search", async () => {
    const onSubmit = vi.fn();
    render(<CountryForm onSubmit={onSubmit} />);

    const trigger = screen.getByRole("combobox", { name: "Country" });
    expect(trigger).toHaveTextContent("Select a country");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Choose a country.")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(trigger);
    // Search matches labels, not values ("de" is Germany's value).
    await userEvent.type(screen.getByPlaceholderText("Search…"), "de");
    expect(await screen.findByText("No country found.")).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText("Search…"));
    await userEvent.type(screen.getByPlaceholderText("Search…"), "germ");
    expect(screen.queryByRole("option", { name: "France" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "Germany" }));

    await vi.waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent("Germany");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ country: "de" });
  });
});
