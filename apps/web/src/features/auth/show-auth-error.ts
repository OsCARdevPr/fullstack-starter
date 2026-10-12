import type { FieldValues, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { getErrorMessage, isApiError } from "@/lib/api-error";

/**
 * Auth form errors: request problems the user can fix (wrong password, email taken) appear on the
 * form; rate limits, network and server failures appear as a toast.
 */
export function showAuthError<T extends FieldValues>(
  form: { setError: UseFormSetError<T> },
  error: unknown,
) {
  const fixableByUser =
    isApiError(error) && error.status >= 400 && error.status < 500 && error.code !== "RATE_LIMITED";
  if (fixableByUser) {
    form.setError("root.server", { type: "server", message: error.message });
  } else {
    toast.error(getErrorMessage(error));
  }
}
