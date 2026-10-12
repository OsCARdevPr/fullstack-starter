import type { FieldValues } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { FormField, type FormFieldProps } from "./form-field";

/** A boolean value as an on/off switch, with the label beside it. */
export function FormSwitch<T extends FieldValues, TOutput = T>(
  fieldProps: FormFieldProps<T, TOutput>,
) {
  return (
    <FormField {...fieldProps} orientation="horizontal">
      {({ field, id, invalid }) => (
        <Switch
          id={id}
          ref={field.ref}
          name={field.name}
          checked={field.value ?? false}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          aria-invalid={invalid}
        />
      )}
    </FormField>
  );
}
