import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error";
import { applyServerErrors } from "./apply-server-errors";

function renderForm() {
  return renderHook(() => {
    const form = useForm({ defaultValues: { name: "", email: "" } });
    // Reading formState during render subscribes the hook to error updates.
    return { form, errors: form.formState.errors };
  }).result;
}

function validationError(fieldErrors: Record<string, string[]>, formErrors: string[] = []) {
  return new ApiError({
    code: "VALIDATION_ERROR",
    status: 422,
    message: "Invalid input.",
    details: { fieldErrors, formErrors },
  });
}

describe("applyServerErrors", () => {
  it("sets the first message of each field error on the matching field", () => {
    const result = renderForm();

    let applied = false;
    act(() => {
      applied = applyServerErrors(
        result.current.form,
        validationError({ name: ["Too short", "Invalid"], email: ["Taken"] }),
      );
    });

    expect(applied).toBe(true);
    expect(result.current.errors.name?.message).toBe("Too short");
    expect(result.current.errors.email?.message).toBe("Taken");
  });

  it("shows form errors and unknown fields as a form-level error", () => {
    const result = renderForm();

    act(() => {
      applyServerErrors(
        result.current.form,
        validationError({ slug: ["Reserved"] }, ["Check the form."]),
      );
    });

    expect(result.current.errors.root?.server?.message).toBe("Check the form. Reserved");
    expect(result.current.errors.name).toBeUndefined();
  });

  it("returns false and sets nothing for other errors", () => {
    const result = renderForm();
    const conflict = new ApiError({ code: "CONFLICT", status: 409, message: "Taken." });

    let applied = true;
    act(() => {
      applied = applyServerErrors(result.current.form, conflict);
    });

    expect(applied).toBe(false);
    expect(result.current.errors).toEqual({});
  });
});
