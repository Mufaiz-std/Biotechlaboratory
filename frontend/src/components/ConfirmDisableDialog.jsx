import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmDisableDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Disable",
  loading,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" disabled={loading} onClick={onConfirm}>
          {loading ? "Please wait…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
