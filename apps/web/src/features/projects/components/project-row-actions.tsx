import type { Project } from "@starter/contracts";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/features/auth/api";
import { useDeleteProject } from "../api";
import { ProjectFormDialog } from "./project-form-dialog";

/** Edit and delete menu of one row. Delete is offered to owners and admins only. */
export function ProjectRowActions({ project }: { project: Project }) {
  const { role } = useMe();
  const canDelete = role === "owner" || role === "admin";
  const deleteProject = useDeleteProject();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <>
      {/* Not modal: a modal menu that opens a dialog can leave the page unclickable. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${project.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("edit")}>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectFormDialog open={dialog === "edit"} onOpenChange={closeDialog} project={project} />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        title="Delete project?"
        description={`"${project.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteProject.mutateAsync(project.id)}
      />
    </>
  );
}
