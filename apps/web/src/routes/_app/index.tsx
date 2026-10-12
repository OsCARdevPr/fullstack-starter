import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/features/auth/api";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

function HomePage() {
  const me = useMe();
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold">Welcome, {me.user.name}</h1>
      {me.organization && <p className="text-muted-foreground">{me.organization.name}</p>}
    </div>
  );
}
