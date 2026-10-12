import type { CreateProjectInput, ProjectStatus, UpdateProjectInput } from "@starter/contracts";
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api-client";
import type { ApiErrorCode } from "@/lib/api-error";

/** Filters of the projects list (the /projects URL search params). */
export interface ProjectListParams {
  page: number;
  q?: string | undefined;
  status?: ProjectStatus | undefined;
}

export const projectKeys = {
  all: ["projects"] as const,
  list: (params: ProjectListParams) => [...projectKeys.all, "list", params] as const,
};

/** One page of projects: `{ data, meta }`. */
export function projectsQueryOptions(params: ProjectListParams) {
  return queryOptions({
    queryKey: projectKeys.list(params),
    queryFn: () =>
      unwrap(
        api.projects.$get({
          // Query values travel as strings on the RPC client; the API coerces them.
          query: { page: String(params.page), q: params.q, status: params.status },
        }),
      ),
    // Keep the current rows on screen while the next page or search result loads.
    placeholderData: keepPreviousData,
  });
}

// ProjectForm shows these on its fields; any other error gets the global toast.
const FORM_ERRORS: ApiErrorCode[] = ["VALIDATION_ERROR", "CONFLICT"];

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CreateProjectInput) =>
      (await unwrap(api.projects.$post({ json: values }))).data,
    onSuccess: async () => {
      toast.success("Project created");
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    meta: { handledErrors: FORM_ERRORS },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UpdateProjectInput }) =>
      (await unwrap(api.projects[":id"].$patch({ param: { id }, json: values }))).data,
    onSuccess: async () => {
      toast.success("Project updated");
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    meta: { handledErrors: FORM_ERRORS },
  });
}

/** Owners and admins only; the API answers 403 to members. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(api.projects[":id"].$delete({ param: { id } }));
    },
    onSuccess: async () => {
      toast.success("Project deleted");
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
