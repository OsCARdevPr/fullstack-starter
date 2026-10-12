import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Link,
  Outlet,
} from "@tanstack/react-router";
import type { RouterContext } from "@/app/router";
import { EmptyState, RouteError } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      {/* Full-height column so error and empty states can center themselves. */}
      <div className="flex min-h-svh flex-col">
        <Outlet />
      </div>
      <Toaster richColors closeButton />
    </>
  );
}

// Replaces the whole page, so it brings its own full-height column.
function RootError(props: ErrorComponentProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <RouteError {...props} />
    </div>
  );
}

function NotFound() {
  return (
    <EmptyState
      className="min-h-svh"
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      }
    />
  );
}
