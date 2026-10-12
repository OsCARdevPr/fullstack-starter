import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Link,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import type { RouterContext } from "@/app/router";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Toaster } from "@/components/ui/sonner";
import { getErrorMessage, isApiError } from "@/lib/api-error";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster richColors closeButton />
    </>
  );
}

function RootError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
        {isApiError(error) && error.requestId && (
          <EmptyDescription className="text-xs">Reference: {error.requestId}</EmptyDescription>
        )}
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => router.invalidate()}>Try again</Button>
      </EmptyContent>
    </Empty>
  );
}

function NotFound() {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>The page you are looking for does not exist.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
