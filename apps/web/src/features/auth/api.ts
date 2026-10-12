import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, unwrap } from "@/lib/api-client";
import { authClient, toApiError } from "@/lib/auth-client";
import type { SignInValues, SignUpValues } from "./schemas";

export const authKeys = {
  me: ["me"] as const,
  config: ["config"] as const,
};

/** Current user and organization. Fails with UNAUTHENTICATED when signed out. */
export function meQueryOptions() {
  return queryOptions({
    queryKey: authKeys.me,
    queryFn: async () => (await unwrap(api.me.$get())).data,
    // Being signed out is expected here; the route guards redirect instead of showing a toast.
    meta: { silent: true },
  });
}

/** Server settings needed before sign-in (tenancy mode, whether sign-up is open). */
export function publicConfigQueryOptions() {
  return queryOptions({
    queryKey: authKeys.config,
    queryFn: async () => (await unwrap(api.config.$get())).data,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** The signed-in user. Use inside the protected `_app` routes, whose guard loads it. */
export function useMe() {
  return useSuspenseQuery(meQueryOptions()).data;
}

export function usePublicConfig() {
  return useSuspenseQuery(publicConfigQueryOptions()).data;
}

/** Sign-in; the form handles errors itself (`meta.silent`). */
export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: SignInValues) => {
      const { error } = await authClient.signIn.email(values);
      if (error) throw toApiError(error);
    },
    onSuccess: () => queryClient.removeQueries({ queryKey: authKeys.me }),
    meta: { silent: true },
  });
}

/** Sign-up; Better Auth signs the new user in. The form handles errors itself. */
export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: SignUpValues) => {
      const { error } = await authClient.signUp.email(values);
      if (error) throw toApiError(error);
    },
    onSuccess: () => queryClient.removeQueries({ queryKey: authKeys.me }),
    meta: { silent: true },
  });
}

/** Signs out, forgets all cached data and returns to the sign-in page. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) throw toApiError(error);
    },
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/sign-in" });
    },
  });
}
