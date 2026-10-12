import type { ReactNode } from "react";
import type { FieldValues } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, type FormFieldProps } from "./form-field";

export interface SelectOption {
  value: string;
  label: ReactNode;
}

export function FormSelect<T extends FieldValues, TOutput = T>({
  options,
  placeholder,
  ...fieldProps
}: FormFieldProps<T, TOutput> & { options: SelectOption[]; placeholder?: string }) {
  return (
    <FormField {...fieldProps}>
      {({ field, id, invalid }) => (
        <Select
          name={field.name}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={field.disabled}
        >
          <SelectTrigger id={id} ref={field.ref} onBlur={field.onBlur} aria-invalid={invalid}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
