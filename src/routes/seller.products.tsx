import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WizardStepper } from "@/components/WizardStepper";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { uploadFile } from "@/lib/upload";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatKES } from "@/lib/pricing";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttributeFieldsEditor } from "@/components/AttributeFields";
import { getAttributeSchema } from "@/lib/product-attributes";

export const Route = createFileRoute("/seller/products")({ component: SellerProducts });

function SellerProducts() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle();
    setShop(s);
    if (s) {
      const { data } = await supabase.from("products").select("*").eq("shop_id", s.id).order("created_at", { ascending: false });
      setProducts(data ?? []);
    }
  };
  useEffect(() => { load(); }, [user]);

  if (!shop) return <p className="text-muted-foreground">Set up your shop first.</p>;

  const remove = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products</h2>
        <ProductWizard shopId={shop.id} userId={user!.id} onDone={load} />
      </div>
      {products.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No products. Click Add.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="aspect-square bg-secondary">{p.image_url && <img src={p.image_url} className="h-full w-full object-cover" alt="" />}</div>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.category} · stock {p.stock}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">{formatKES(Number(p.price))}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductWizard({ shopId, userId, onDone }: { shopId: string; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isFood, setIsFood] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const hasAttrStep = getAttributeSchema(category).length > 0;
  const steps = hasAttrStep ? ["Basics", "Maelezo", "Bei", "Picha"] : ["Basics", "Bei", "Picha"];

  const reset = () => {
    setStep(0); setName(""); setDescription(""); setCategory(""); setIsFood(false);
    setPrice(""); setStock(""); setFile(null); setAttributes({});
  };

  const save = async () => {
    setBusy(true);
    const url = file ? await uploadFile("products", userId, file, "product") : null;
    const { error } = await supabase.from("products").insert({
      shop_id: shopId, name, description, category, is_food: isFood,
      price: Number(price) || 0, stock: Number(stock) || 0, image_url: url,
      attributes,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Product added");
    setOpen(false); reset(); onDone();
  };

  // Step indices change when the attributes step is present
  const basicsIdx = 0;
  const attrIdx = hasAttrStep ? 1 : -1;
  const priceIdx = hasAttrStep ? 2 : 1;
  const photoIdx = hasAttrStep ? 3 : 2;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add product</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add product</DialogTitle></DialogHeader>
        <WizardStepper steps={steps} current={step} />
        {step === 0 && (
          <div className="space-y-3">
            <div><Label>Jina la bidhaa · Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mchele wa Mbeya 5kg" /></div>
            <div><Label>Maelezo · Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
            <div>
              <Label>Aina · Category *</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  const c = getCategory(v);
                  if (c.isFood) setIsFood(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chagua aina ya bidhaa" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.key} value={c.key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span>{c.sw} <span className="text-muted-foreground">· {c.en}</span></span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Chakula · Food / cooked item</Label>
              <Switch checked={isFood} onCheckedChange={setIsFood} />
            </div>
          </div>
        )}
        {hasAttrStep && step === attrIdx && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground">
              Jaza sifa za bidhaa hii. Mteja atatumia hizi kuchagua saizi/rangi wakati wa kuagiza.
            </p>
            <AttributeFieldsEditor category={category} value={attributes} onChange={setAttributes} />
          </div>
        )}
        {step === priceIdx && (
          <div className="space-y-3">
            <div><Label>Price (TSh)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div><Label>Stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
          </div>
        )}
        {step === photoIdx && (
          <div className="space-y-3">
            <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </div>
        )}
        <div className="mt-2 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && (!name || !category)}>Inayofuata · Next</Button>
          ) : (
            <Button onClick={save} disabled={busy || !price}>{busy ? "Saving…" : "Save"}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
