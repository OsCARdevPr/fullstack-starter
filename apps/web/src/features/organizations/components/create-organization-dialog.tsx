import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateOrganizationForm } from "./create-organization-form";

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            You will be its owner, and it becomes your active organization.
          </DialogDescription>
        </DialogHeader>
        <CreateOrganizationForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
