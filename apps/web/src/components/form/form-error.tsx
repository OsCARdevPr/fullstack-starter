import { type Control, type FieldValues, useFormState } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Form-level error (`errors.root.server`), set by `applyServerErrors` or `setError`. */
export function FormError<T extends FieldValues, TOutput = T>({
  control,
}: {
  control: Control<T, unknown, TOutput>;
}) {
  const { errors } = useFormState({ control });
  const message = errors.root?.server?.message;
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
