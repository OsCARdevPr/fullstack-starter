import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetError } from "react-hook-form";
import { getValidationDetails } from "@/lib/api-error";

interface FormErrorTarget<T extends FieldValues> {
  setError: UseFormSetError<T>;
  getValues: UseFormGetValues<T>;
}

/**
 * Shows a server VALIDATION_ERROR on the form: each field error on its field, and form errors
 * (plus errors for fields the form does not have) as `errors.root.server`, rendered by
 * `<FormError />`. Returns false when the error is not a validation error, so the caller can
 * handle it another way (e.g. map a 409 CONFLICT to a field).
 */
export function applyServerErrors<T extends FieldValues>(
  form: FormErrorTarget<T>,
  error: unknown,
): boolean {
  const details = getValidationDetails(error);
  if (!details) return false;

  const values = form.getValues();
  const formMessages = [...details.formErrors];
  for (const [field, messages] of Object.entries(details.fieldErrors)) {
    const [message] = messages;
    if (!message) continue;
    if (field in values) {
      form.setError(field as FieldPath<T>, { type: "server", message });
    } else {
      formMessages.push(message);
    }
  }
  if (formMessages.length > 0) {
    form.setError("root.server", { type: "server", message: formMessages.join(" ") });
  }
  return true;
}
