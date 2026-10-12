import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient, toApiError } from "@/lib/auth-client";
import { type CreateOrganizationValues, organizationSlug } from "./schemas";

export const organizationKeys = {
  all: ["organizations"] as const,
};

/** Organizations the signed-in user belongs to (multi tenancy mode). */
export function organizationsQueryOptions() {
  return queryOptions({
    queryKey: organizationKeys.all,
    queryFn: async () => {
      const { data, error } = await authClient.organization.list();
      if (error) throw toApiError(error);
      return data;
    },
  });
}

/** Makes another organization the active one, then reloads every query for it. */
export function useSetActiveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId });
      if (error) throw toApiError(error);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Creates an organization owned by the user; Better Auth also makes it the active one. */
export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: CreateOrganizationValues) => {
      const { error } = await authClient.organization.create({
        name,
        slug: organizationSlug(name),
      });
      if (error) throw toApiError(error);
    },
    onSuccess: async () => {
      toast.success("Organization created");
      await queryClient.invalidateQueries();
    },
    // The form shows the error itself.
    meta: { silent: true },
  });
}
