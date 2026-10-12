import { type ReactNode, useId } from "react";
import {
  type Control,
  Controller,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

/** Props shared by every form field component (`FormInput`, `FormSelect`, `FormCheckbox`…). */
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

/**
 * Label, control, description and error message for one form value. `horizontal` puts the control
 * before the label, for checkboxes and switches.
 */
export function FormField<T extends FieldValues, TOutput = T>({
  control,
  name,
  label,
  description,
  orientation = "vertical",
  children,
}: FormFieldProps<T, TOutput> & {
  orientation?: "vertical" | "horizontal";
  children: (props: FormControlProps<T>) => ReactNode;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const input = children({ field, id, invalid: fieldState.invalid });
        const labelElement = <FieldLabel htmlFor={id}>{label}</FieldLabel>;
        const details = (
          <>
            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </>
        );
        if (orientation === "horizontal") {
          return (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              {input}
              <FieldContent>
                {labelElement}
                {details}
              </FieldContent>
            </Field>
          );
        }
        return (
          <Field data-invalid={fieldState.invalid}>
            {labelElement}
            {input}
            {details}
          </Field>
        );
      }}
    />
  );
}
