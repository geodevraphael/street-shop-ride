const map: Record<string, { label: string; cls: string }> = {
  placed: { label: "Placed", cls: "bg-secondary text-secondary-foreground" },
  accepted: { label: "Accepted", cls: "bg-accent text-accent-foreground" },
  rider_assigned: { label: "Rider assigned", cls: "bg-warning text-warning-foreground" },
  picked_up: { label: "Picked up", cls: "bg-warning text-warning-foreground" },
  delivered: { label: "Delivered", cls: "bg-success text-success-foreground" },
  completed: { label: "Completed", cls: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-destructive text-destructive-foreground" },
};

export function OrderStatusPill({ status }: { status: string }) {
  const m = map[status] ?? { label: status, cls: "bg-secondary text-secondary-foreground" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}
