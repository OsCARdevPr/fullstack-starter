import { createProjectSchema, type Project, projectStatusSchema } from "@starter/contracts";
import {
  applyServerErrors,
  FormError,
  FormInput,
  FormSelect,
  FormTextarea,
  useZodForm,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api-error";
import { useCreateProject, useUpdateProject } from "../api";
import { PROJECT_STATUS_LABELS } from "./project-status-badge";

const statusOptions = projectStatusSchema.options.map((status) => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

export interface ProjectFormProps {
  /** The project to edit; omit it to create a new one. */
  project?: Project;
  onSuccess: (project: Project) => void;
  onCancel?: () => void;
}

/** Create and edit form. It validates with the same contract schema as the API. */
export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  // The create schema covers every field, so it validates edits too (PATCH accepts all fields).
  const form = useZodForm(createProjectSchema, {
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      status: project?.status ?? "active",
    },
  });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isPending = createProject.isPending || updateProject.isPending;

  const showServerError = (error: unknown) => {
    // The API reports a duplicate name as CONFLICT without field details.
    if (isApiError(error) && error.code === "CONFLICT") {
      form.setError("name", { type: "server", message: error.message });
      return;
    }
    applyServerErrors(form, error);
  };

  const onSubmit = form.handleSubmit((values) => {
    const callbacks = { onSuccess, onError: showServerError };
    if (project) updateProject.mutate({ id: project.id, values }, callbacks);
    else createProject.mutate(values, callbacks);
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError control={form.control} />
        <FormInput control={form.control} name="name" label="Name" autoComplete="off" />
        <FormTextarea control={form.control} name="description" label="Description" rows={3} />
        <FormSelect control={form.control} name="status" label="Status" options={statusOptions} />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            {project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
