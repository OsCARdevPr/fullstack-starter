import { FormError, FormInput, useZodForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSignIn } from "../api";
import { signInSchema } from "../schemas";
import { showAuthError } from "../show-auth-error";

export function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useZodForm(signInSchema, { defaultValues: { email: "", password: "" } });
  const signIn = useSignIn();

  const onSubmit = form.handleSubmit((values) =>
    signIn.mutate(values, { onSuccess, onError: (error) => showAuthError(form, error) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError control={form.control} />
        <FormInput
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <FormInput
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" disabled={signIn.isPending}>
          {signIn.isPending && <Spinner />}
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
