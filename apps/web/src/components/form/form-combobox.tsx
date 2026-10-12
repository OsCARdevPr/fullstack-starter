import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormField, type FormFieldProps } from "./form-field";

export interface ComboboxOption {
  value: string;
  label: string;
}

/** Matches the search against the option label only: values are often ids. */
function matchLabel(_value: string, search: string, keywords?: string[]) {
  const label = keywords?.[0] ?? "";
  return label.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0;
}

/** A single value picked from a searchable list of options. */
export function FormCombobox<T extends FieldValues, TOutput = T>({
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  ...fieldProps
}: FormFieldProps<T, TOutput> & {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormField {...fieldProps}>
      {({ field, id, invalid }) => {
        const selected = options.find((option) => option.value === field.value);
        return (
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
                role="combobox"
                aria-expanded={open}
                disabled={field.disabled}
                aria-invalid={invalid}
                data-empty={!selected}
                className="w-full justify-between font-normal data-[empty=true]:text-muted-foreground"
              >
                <span className="truncate">{selected?.label ?? placeholder}</span>
                <ChevronsUpDown className="opacity-50" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
              <Command filter={matchLabel}>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.label]}
                        data-checked={option.value === field.value}
                        onSelect={() => {
                          field.onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );
      }}
    </FormField>
  );
}
