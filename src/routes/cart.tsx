import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useCart, cart } from "@/lib/cart";
import { formatTSh } from "@/lib/pricing";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({ component: Cart });

function Cart() {
  const items = useCart();
  const nav = useNavigate();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  if (items.length === 0)
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-xl font-semibold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Browse shops and add some products.</p>
          <Link to="/shops"><Button className="mt-4">Browse shops</Button></Link>
        </div>
      </AppShell>
    );

  const shop = items[0];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">From <b>{shop.shopName}</b></p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.productId} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <div className="h-14 w-14 overflow-hidden rounded-lg bg-secondary">
                {i.image_url ? <img src={i.image_url} className="h-full w-full object-cover" alt={i.name} /> : null}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{i.name}</h3>
                <p className="text-sm text-muted-foreground">{formatKES(i.price)} ea</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(i.productId, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-8 text-center text-sm">{i.qty}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(i.productId, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <Button size="icon" variant="ghost" onClick={() => cart.remove(i.productId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-semibold">Order summary</h3>
          <div className="mt-3 flex justify-between text-sm"><span>Subtotal</span><span>{formatKES(total)}</span></div>
          <div className="mt-1 text-xs text-muted-foreground">Delivery fee calculated at checkout.</div>
          <Button className="mt-4 w-full" onClick={() => nav({ to: "/checkout" })}>Checkout</Button>
        </div>
      </div>
    </AppShell>
  );
}
