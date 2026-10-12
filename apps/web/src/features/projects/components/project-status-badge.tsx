import type { ProjectStatus } from "@starter/contracts";
import { Badge } from "@/components/ui/badge";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={status === "active" ? "secondary" : "outline"}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
