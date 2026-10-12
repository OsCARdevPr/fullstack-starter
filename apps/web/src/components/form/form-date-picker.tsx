import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";
import type { FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { FormField, type FormFieldProps } from "./form-field";

/**
 * A `Date | undefined` value picked from a calendar in a popover. `disabledDates` takes any
 * react-day-picker matcher, e.g. `{ before: new Date() }` or `{ dayOfWeek: [0, 6] }`.
 */
export function FormDatePicker<T extends FieldValues, TOutput = T>({
  placeholder = "Pick a date",
  disabledDates,
  ...fieldProps
}: FormFieldProps<T, TOutput> & { placeholder?: string; disabledDates?: Matcher | Matcher[] }) {
  const [open, setOpen] = useState(false);
  return (
    <FormField {...fieldProps}>
      {({ field, id, invalid }) => (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) field.onBlur();
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={id}
              ref={field.ref}
              type="button"
              variant="outline"
              disabled={field.disabled}
              aria-invalid={invalid}
              data-empty={!field.value}
              className="w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
            >
              <CalendarIcon aria-hidden />
              {field.value ? formatDate(field.value) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value}
              defaultMonth={field.value}
              disabled={disabledDates}
              onSelect={(date) => {
                field.onChange(date);
                setOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </FormField>
  );
}
