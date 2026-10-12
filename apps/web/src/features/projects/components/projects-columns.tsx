import type { Project } from "@starter/contracts";
import type { DataTableColumn } from "@/components/data";
import { formatDate } from "@/lib/format";
import { ProjectRowActions } from "./project-row-actions";
import { ProjectStatusBadge } from "./project-status-badge";

export const projectsColumns: DataTableColumn<Project>[] = [
  {
    id: "name",
    header: "Name",
    cell: (project) => (
      // Narrow on phones so the status and actions columns stay on screen.
      <div className="flex max-w-40 flex-col sm:max-w-md">
        <span className="truncate font-medium">{project.name}</span>
        {project.description && (
          <span className="truncate text-muted-foreground">{project.description}</span>
        )}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (project) => <ProjectStatusBadge status={project.status} />,
  },
  {
    id: "updatedAt",
    header: "Updated",
    cell: (project) => formatDate(project.updatedAt),
    className: "hidden text-muted-foreground md:table-cell",
  },
  {
    id: "actions",
    header: <span className="sr-only">Actions</span>,
    cell: (project) => <ProjectRowActions project={project} />,
    className: "w-12 text-right",
  },
];
