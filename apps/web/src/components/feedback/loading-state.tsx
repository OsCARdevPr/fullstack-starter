import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Centered spinner with a short label, announced to screen readers. */
export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner aria-hidden="true" />
      {label}
    </div>
  );
}
