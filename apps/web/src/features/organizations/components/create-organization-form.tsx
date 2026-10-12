import { FormError, FormInput, useZodForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { showAuthError } from "@/features/auth/show-auth-error";
import { useCreateOrganization } from "../api";
import { createOrganizationSchema } from "../schemas";

export function CreateOrganizationForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useZodForm(createOrganizationSchema, { defaultValues: { name: "" } });
  const createOrganization = useCreateOrganization();

  const onSubmit = form.handleSubmit((values) =>
    createOrganization.mutate(values, {
      onSuccess: () => onSuccess?.(),
      onError: (error) => showAuthError(form, error),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError control={form.control} />
        <FormInput
          control={form.control}
          name="name"
          label="Organization name"
          autoComplete="organization"
        />
        <Button type="submit" disabled={createOrganization.isPending}>
          {createOrganization.isPending && <Spinner />}
          Create organization
        </Button>
      </FieldGroup>
    </form>
  );
}
