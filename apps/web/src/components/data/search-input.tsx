import { Search } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type"> {
  value: string;
  /** Called once the user stops typing for `delay` ms. */
  onValueChange: (value: string) => void;
  delay?: number;
}

/** Search box for lists. It debounces typing so the URL and the API are not hit on every key. */
export function SearchInput({
  value,
  onValueChange,
  delay = 300,
  className,
  ...inputProps
}: SearchInputProps) {
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow changes made elsewhere (back button, a "clear filters" link).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onValueChange(next), delay);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        {...inputProps}
        type="search"
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        className="pl-8"
      />
    </div>
  );
}
