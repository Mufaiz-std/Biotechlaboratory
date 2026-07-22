import { cn } from "@/lib/utils";

const statusStyles = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  Accepted: "bg-primary/15 text-primary border-primary/30",
  Completed: "bg-success/15 text-success border-success/30",
  Rejected: "bg-danger/15 text-danger border-danger/30",
  Cancelled: "bg-muted/15 text-muted border-border",
  "Inquiry Sent": "bg-secondary/15 text-secondary border-secondary/30",
  "Time Adjustment Requested": "bg-secondary/15 text-secondary border-secondary/30",
};

export function Badge({ status, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status ? statusStyles[status] || "bg-muted/15 text-muted border-border" : "",
        className,
      )}
    >
      {children || status}
    </span>
  );
}
