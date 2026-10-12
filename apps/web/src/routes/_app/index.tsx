import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/features/auth/api";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const me = useMe();
  return (
    <>
      <PageHeader title={`Welcome, ${me.user.name}`} description={me.organization?.name} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/projects" className="group rounded-xl focus-visible:outline-2">
          <Card className="h-full transition-colors group-hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-4" aria-hidden />
                Projects
                <ArrowRight
                  className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </CardTitle>
              <CardDescription>
                Create, edit and track your organization's projects.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </>
  );
}
