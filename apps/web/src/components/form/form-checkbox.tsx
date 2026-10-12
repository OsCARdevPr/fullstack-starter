import type { FieldValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, type FormFieldProps } from "./form-field";

/** A boolean value as a checkbox, with the label beside it. */
export function FormCheckbox<T extends FieldValues, TOutput = T>(
  fieldProps: FormFieldProps<T, TOutput>,
) {
  return (
    <FormField {...fieldProps} orientation="horizontal">
      {({ field, id, invalid }) => (
        <Checkbox
          id={id}
          ref={field.ref}
          name={field.name}
          checked={field.value ?? false}
          onCheckedChange={(checked) => field.onChange(checked === true)}
          onBlur={field.onBlur}
          disabled={field.disabled}
          aria-invalid={invalid}
        />
      )}
    </FormField>
  );
}
