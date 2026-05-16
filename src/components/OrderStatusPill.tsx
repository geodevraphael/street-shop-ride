const map: Record<string, { label: string; cls: string }> = {
  placed: { label: "Imewekwa", cls: "bg-secondary text-secondary-foreground" },
  accepted: { label: "Imekubaliwa", cls: "bg-accent text-accent-foreground" },
  payment_submitted: { label: "Malipo yameletwa", cls: "bg-warning text-warning-foreground" },
  payment_confirmed: { label: "Malipo yamethibitishwa", cls: "bg-success/80 text-success-foreground" },
  rider_assigned: { label: "Boda imepatikana", cls: "bg-warning text-warning-foreground" },
  picked_up: { label: "Inatumwa", cls: "bg-warning text-warning-foreground" },
  courier_dropped: { label: "Imefika ofisi ya courier", cls: "bg-warning text-warning-foreground" },
  courier_in_transit: { label: "Safarini (courier)", cls: "bg-warning text-warning-foreground" },
  courier_arrived: { label: "Imefika ofisi ya mteja", cls: "bg-success/80 text-success-foreground" },
  delivered: { label: "Imefika", cls: "bg-success text-success-foreground" },
  completed: { label: "Imekamilika", cls: "bg-success text-success-foreground" },
  cancelled: { label: "Imeghairiwa", cls: "bg-destructive text-destructive-foreground" },
};

export function OrderStatusPill({ status }: { status: string }) {
  const m = map[status] ?? { label: status, cls: "bg-secondary text-secondary-foreground" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}
