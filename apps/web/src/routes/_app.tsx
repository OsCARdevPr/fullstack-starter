import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { meQueryOptions, useSignOut } from "@/features/auth/api";
import { isApiError } from "@/lib/api-error";

/** Protected area: every child route requires a session. */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions());
    } catch (error) {
      if (isApiError(error) && error.code === "UNAUTHENTICATED") {
        throw redirect({ to: "/sign-in", search: { redirect: location.href } });
      }
      throw error;
    }
  },
  component: AppLayout,
});

// Placeholder layout; the AppShell (sidebar, topbar, user menu) replaces it.
function AppLayout() {
  const signOut = useSignOut();
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <AppLogo />
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          Sign out
        </Button>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
