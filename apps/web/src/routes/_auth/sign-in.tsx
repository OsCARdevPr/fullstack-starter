import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { usePublicConfig } from "@/features/auth/api";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { safeRedirectPath, signInSearchSchema } from "@/features/auth/schemas";

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: signInSearchSchema,
  component: SignInPage,
});

function SignInPage() {
  const { allowSignup } = usePublicConfig();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <AuthCard
      title="Sign in"
      description="Enter your email and password to continue."
      footer={
        allowSignup && (
          <span>
            Don&apos;t have an account?{" "}
            <Link
              to="/sign-up"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </span>
        )
      }
    >
      <SignInForm onSuccess={() => navigate({ href: safeRedirectPath(redirect) })} />
    </AuthCard>
  );
}
