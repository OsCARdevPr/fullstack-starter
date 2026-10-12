import { FormError, FormInput, useZodForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSignUp } from "../api";
import { PASSWORD_MIN_LENGTH, signUpSchema } from "../schemas";
import { showAuthError } from "../show-auth-error";

export function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useZodForm(signUpSchema, {
    defaultValues: { name: "", email: "", password: "" },
  });
  const signUp = useSignUp();

  const onSubmit = form.handleSubmit((values) =>
    signUp.mutate(values, { onSuccess, onError: (error) => showAuthError(form, error) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError control={form.control} />
        <FormInput control={form.control} name="name" label="Name" autoComplete="name" />
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
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <Button type="submit" disabled={signUp.isPending}>
          {signUp.isPending && <Spinner />}
          Create account
        </Button>
      </FieldGroup>
    </form>
  );
}
