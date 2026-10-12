import type { ComponentProps } from "react";
import type { FieldValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { FormField, type FormFieldProps } from "./form-field";

type TextareaProps = Omit<
  ComponentProps<typeof Textarea>,
  "name" | "value" | "defaultValue" | "id"
>;

export function FormTextarea<T extends FieldValues, TOutput = T>({
  control,
  name,
  label,
  description,
  ...textareaProps
}: FormFieldProps<T, TOutput> & TextareaProps) {
  return (
    <FormField control={control} name={name} label={label} description={description}>
      {({ field, id, invalid }) => (
        <Textarea
          {...textareaProps}
          {...field}
          value={field.value ?? ""}
          id={id}
          aria-invalid={invalid}
        />
      )}
    </FormField>
  );
}
