import type { ComponentProps } from "react";
import type { FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, type FormFieldProps } from "./form-field";

type InputProps = Omit<ComponentProps<typeof Input>, "name" | "value" | "defaultValue" | "id">;

export function FormInput<T extends FieldValues, TOutput = T>({
  control,
  name,
  label,
  description,
  ...inputProps
}: FormFieldProps<T, TOutput> & InputProps) {
  return (
    <FormField control={control} name={name} label={label} description={description}>
      {({ field, id, invalid }) => (
        <Input
          {...inputProps}
          {...field}
          value={field.value ?? ""}
          id={id}
          aria-invalid={invalid}
        />
      )}
    </FormField>
  );
}
