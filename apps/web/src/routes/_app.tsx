import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout";
import { meQueryOptions, useMe } from "@/features/auth/api";
import { CreateFirstOrganization } from "@/features/organizations/components/create-first-organization";
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

function AppLayout() {
  const me = useMe();
  // In multi tenancy mode a new user has no organization yet, and every page needs one.
  const needsOrganization = me.tenancyMode === "multi" && !me.organization;
  return <AppShell>{needsOrganization ? <CreateFirstOrganization /> : <Outlet />}</AppShell>;
}
