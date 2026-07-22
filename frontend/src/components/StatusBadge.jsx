import { cn } from "@/lib/utils";

const variants = {
  Pending: "bg-warning/15 text-warning",
  "Inquiry Sent": "bg-primary-light text-primary",
  "Time Adjustment Requested": "bg-primary-light text-primary",
  Accepted: "bg-success/15 text-success",
  Rejected: "bg-danger/15 text-danger",
  Cancelled: "bg-muted/20 text-muted",
  Completed: "bg-success/15 text-success",
};

export default function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        variants[status] || "bg-muted/20 text-muted",
        className,
      )}
    >
      {status}
    </span>
  );
}
