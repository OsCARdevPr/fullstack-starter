import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/query-client";
import { createAppRouter } from "./router";
import { ThemeProvider } from "./theme-provider";

const queryClient = createQueryClient({
  // The session expired while using the app: go to sign-in and come back afterwards.
  onUnauthenticated: () => {
    const { pathname, href } = router.state.location;
    if (pathname === "/sign-in") return;
    void router.navigate({ to: "/sign-in", search: { redirect: href } });
  },
});

const router = createAppRouter(queryClient);

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
