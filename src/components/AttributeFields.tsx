// Seller-side editor for the per-category attribute schema (size lists, colors, year, etc.)
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAttributeSchema, type AttributeField } from "@/lib/product-attributes";
import { X } from "lucide-react";

type Props = {
  category?: string | null;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
};

export function AttributeFieldsEditor({ category, value, onChange }: Props) {
  const fields = getAttributeSchema(category);
  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground">Hakuna sifa za ziada kwa aina hii.</p>;
  }
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldRow key={f.key} field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
      ))}
    </div>
  );
}

function FieldRow({ field, value, onChange }: { field: AttributeField; value: any; onChange: (v: any) => void }) {
  if (field.type === "text") {
    return (
      <div>
        <Label>{field.label}{field.required && " *"}</Label>
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.unit} />
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <div>
        <Label>{field.label}{field.required && " *"} {field.unit && <span className="text-xs text-muted-foreground">({field.unit})</span>}</Label>
        <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        <Label>{field.label}{field.required && " *"}</Label>
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Chagua…" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  // multiselect (chips)
  const selected: string[] = Array.isArray(value) ? value : [];
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);

  return (
    <div>
      <Label>{field.label}{field.required && " *"}</Label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(field.options ?? []).map((o) => {
          const on = selected.includes(o);
          return (
            <Button
              key={o}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => toggle(o)}
            >
              {o}{on && <X className="ml-1 h-3 w-3" />}
            </Button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{selected.length} zimechaguliwa</p>
      )}
    </div>
  );
}

/**
 * Read-only summary chips shown on the product detail page so buyers can
 * see all the static specs (brand, year, material, etc.) at a glance.
 */
export function AttributeSummary({ category, value }: { category?: string | null; value: Record<string, any> }) {
  const fields = getAttributeSchema(category);
  const rows = fields
    .map((f) => {
      const v = value?.[f.key];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
      const display = Array.isArray(v) ? v.join(", ") : String(v) + (f.unit ? ` ${f.unit}` : "");
      return { label: f.label.split(" · ")[0], value: display };
    })
    .filter(Boolean) as { label: string; value: string }[];
  if (rows.length === 0) return null;
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border bg-secondary/40 p-3 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Buyer-side picker: only renders fields marked buyerPick where the seller
 * provided choices. Returns the selection map.
 */
export function BuyerVariantPicker({
  category,
  productAttributes,
  value,
  onChange,
}: {
  category?: string | null;
  productAttributes: Record<string, any>;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const fields = getAttributeSchema(category).filter((f) => {
    if (!f.buyerPick) return false;
    const v = productAttributes?.[f.key];
    if (f.type === "multiselect") return Array.isArray(v) && v.length > 0;
    if (f.type === "select") return Array.isArray(f.options) && f.options.length > 0;
    return v != null && v !== "";
  });
  if (fields.length === 0) return null;
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });

  return (
    <div className="mt-4 space-y-3 rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold">Chagua chaguo lako</p>
      {fields.map((f) => {
        // Source options: for multiselect/select, use the seller's curated list when present.
        const sellerOpts: string[] | undefined = Array.isArray(productAttributes?.[f.key])
          ? productAttributes[f.key]
          : f.options;
        const current = value?.[f.key] ?? "";
        return (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(sellerOpts ?? []).map((opt: string) => {
                const on = current === opt;
                return (
                  <Button
                    key={opt}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => set(f.key, opt)}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
            {!current && <Badge variant="secondary" className="mt-1 text-[10px]">Inahitajika</Badge>}
          </div>
        );
      })}
    </div>
  );
}
