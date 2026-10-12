import { projectStatusSchema } from "@starter/contracts";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { DataPagination, DataTable, SearchInput } from "@/components/data";
import { EmptyState } from "@/components/feedback";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectsQueryOptions } from "@/features/projects/api";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import { PROJECT_STATUS_LABELS } from "@/features/projects/components/project-status-badge";
import { projectsColumns } from "@/features/projects/components/projects-columns";

// Filters live in the URL so they survive reloads and can be shared. Invalid values are dropped.
const projectsSearchSchema = z.object({
  page: z.number().int().min(2).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  status: projectStatusSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/_app/projects/")({
  validateSearch: projectsSearchSchema,
  component: ProjectsPage,
});

const ALL_STATUSES = "all";

function ProjectsPage() {
  const { page = 1, q, status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [creating, setCreating] = useState(false);
  const projects = useQuery(projectsQueryOptions({ page, q, status }));

  // Any filter change goes back to the first page (page 1 is left out of the URL).
  const setFilters = (filters: { q?: string | undefined; status?: typeof status }) =>
    navigate({ search: (previous) => ({ ...previous, ...filters, page: undefined }) });
  const setPage = (next: number) =>
    navigate({ search: (previous) => ({ ...previous, page: next > 1 ? next : undefined }) });

  const isFiltered = Boolean(q || status);
  const newProjectButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus data-icon="inline-start" />
      New project
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Create, edit and track your organization's projects."
        actions={newProjectButton}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          aria-label="Search projects"
          placeholder="Search projects…"
          maxLength={100}
          value={q ?? ""}
          onValueChange={(value) => setFilters({ q: value || undefined })}
          className="sm:max-w-xs sm:flex-1"
        />
        <Select
          value={status ?? ALL_STATUSES}
          onValueChange={(value) =>
            setFilters({ status: projectStatusSchema.safeParse(value).data })
          }
        >
          <SelectTrigger aria-label="Filter by status" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {projectStatusSchema.options.map((option) => (
              <SelectItem key={option} value={option}>
                {PROJECT_STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={projectsColumns}
        rows={projects.data?.data}
        getRowId={(project) => project.id}
        isLoading={projects.isPending}
        error={projects.error}
        onRetry={() => projects.refetch()}
        empty={
          isFiltered ? (
            <EmptyState title="No matching projects" description="Try other filters." />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create the first project of your organization."
              action={newProjectButton}
            />
          )
        }
      />
      <DataPagination
        page={page}
        totalPages={projects.data?.meta.totalPages ?? 0}
        onPageChange={setPage}
      />
      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
