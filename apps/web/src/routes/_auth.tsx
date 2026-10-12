import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meQueryOptions, publicConfigQueryOptions } from "@/features/auth/api";

/** Public pages for signed-out visitors; signed-in users go straight to the app. */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions()).catch(() => null);
    if (me) throw redirect({ to: "/" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicConfigQueryOptions()),
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Outlet />
    </main>
  );
}
