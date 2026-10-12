import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getErrorMessage, isApiError } from "@/lib/api-error";

export interface ErrorStateProps {
  error: unknown;
  title?: string;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
  className?: string;
}

/**
 * A failed load: the ApiError message (generic text for anything else), the request id to quote
 * to support when there is one, and an optional retry.
 */
export function ErrorState({
  error,
  title = "Something went wrong",
  onRetry,
  className,
}: ErrorStateProps) {
  const requestId = isApiError(error) ? error.requestId : undefined;
  return (
    <Empty role="alert" className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-destructive">
          <CircleAlert aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
        {requestId && (
          <EmptyDescription className="text-xs">Reference: {requestId}</EmptyDescription>
        )}
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
