import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Store, ShoppingBag, Bike, Shield, MapPin, Search, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalMarket — Buy local, deliver fast" },
      { name: "description", content: "Order from local shops, pay with Lipa, get delivered by nearby boda boda." },
    ],
  }),
  component: Index,
});

function RoleCard({
  to, icon: Icon, title, desc, accent,
}: { to: string; icon: any; title: string; desc: string; accent?: boolean }) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col gap-3 rounded-2xl border p-5 transition hover:border-primary hover:shadow-md ${
        accent ? "bg-gradient-to-br from-primary/10 to-accent" : "bg-card"
      }`}
    >
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function Index() {
  return (
    <AppShell>
      <section className="rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-accent p-8 md:p-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <MapPin className="h-3 w-3 text-primary" /> Your neighborhood marketplace
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Shop your street. <span className="text-primary">Delivered by boda.</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Browse local shops, pay with Lipa or QR, and get it brought to your doorstep by a nearby rider — minimum KES 1,500.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/shops" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Store className="h-4 w-4" /> Browse shops
            </Link>
            <Link to="/products/search" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary">
              <Search className="h-4 w-4" /> Search products
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Get started</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RoleCard to="/auth/register?role=client" icon={ShoppingBag} title="Shop as Client" desc="Order from shops near you. Save Home, Office & more." accent />
          <RoleCard to="/auth/register?role=seller" icon={Store} title="Sell from your shop" desc="List products. Get Lipa & QR payments. Find a boda." />
          <RoleCard to="/auth/register?role=rider" icon={Bike} title="Ride as Boda Boda" desc="Earn from local deliveries near you." />
          <RoleCard to="/auth/login" icon={Shield} title="Staff Sign-in" desc="Admin & Customer Support." />
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Local first", d: "Find shops by street, ward, or right next to you." },
          { t: "Bolt-like pricing", d: "Auto-priced delivery: 1500 base + KES 100/km + 20/min." },
          { t: "Verified riders", d: "Drivers with Driving Licence are flagged Verified." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
