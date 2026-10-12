import { type MouseEvent, type ReactNode, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

export interface ConfirmDialogProps {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for actions that delete or cannot be undone. */
  destructive?: boolean;
  /**
   * Runs when the user confirms. The dialog stays open (buttons disabled) until it settles,
   * closes when it resolves and stays open when it rejects (report the error, e.g. a toast).
   */
  onConfirm: () => unknown;
  /** Element that opens the dialog. Omit it and pass `open`/`onOpenChange` to control it. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** "Are you sure?" dialog for an async action. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  trigger,
  open: openProp,
  onOpenChange,
}: ConfirmDialogProps) {
  const [openState, setOpenState] = useState(false);
  const [pending, setPending] = useState(false);
  const open = openProp ?? openState;

  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };

  const confirm = async (event: MouseEvent) => {
    // The action button closes the dialog by default; keep it open until the action settles.
    event.preventDefault();
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // The caller reports the failure (mutations show a toast); the dialog stays open.
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
