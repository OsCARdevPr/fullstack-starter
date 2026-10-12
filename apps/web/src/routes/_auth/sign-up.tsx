import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { publicConfigQueryOptions } from "@/features/auth/api";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const Route = createFileRoute("/_auth/sign-up")({
  // Invite-only apps (AUTH_ALLOW_SIGNUP=false) have no public sign-up page.
  beforeLoad: async ({ context }) => {
    const config = await context.queryClient.ensureQueryData(publicConfigQueryOptions());
    if (!config.allowSignup) throw redirect({ to: "/sign-in" });
  },
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  return (
    <AuthCard
      title="Create an account"
      description="Enter your details to get started."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            to="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <SignUpForm onSuccess={() => navigate({ to: "/" })} />
    </AuthCard>
  );
}
