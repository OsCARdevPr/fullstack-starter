import { type ReactNode, useId } from "react";
import {
  type Control,
  Controller,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/** Props shared by every form field component (`FormInput`, `FormTextarea`, `FormSelect`). */
export interface FormFieldProps<T extends FieldValues, TOutput = T> {
  control: Control<T, unknown, TOutput>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
}

export interface FormControlProps<T extends FieldValues> {
  field: ControllerRenderProps<T, FieldPath<T>>;
  id: string;
  invalid: boolean;
}

/** Label, control, description and error message for one form value. */
export function FormField<T extends FieldValues, TOutput = T>({
  control,
  name,
  label,
  description,
  children,
}: FormFieldProps<T, TOutput> & { children: (props: FormControlProps<T>) => ReactNode }) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {children({ field, id, invalid: fieldState.invalid })}
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
