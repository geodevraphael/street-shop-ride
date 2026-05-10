import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Store, Home, ShoppingBag, User, Bike, Shield, LogOut, Menu, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const items = useCart();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/shops", label: "Shops", icon: Store },
    { to: "/products/search", label: "Search", icon: MapPin },
    { to: "/cart", label: "Cart", icon: ShoppingBag, badge: items.length || undefined },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Soko</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={`relative rounded-md px-3 py-1.5 text-sm transition ${
                  path === it.to ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {it.label}
                {it.badge ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {it.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {roles.includes("seller") && (
              <Link to="/seller" className="hidden md:inline">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Store className="h-4 w-4" /> Seller
                </Button>
              </Link>
            )}
            {roles.includes("rider") && (
              <Link to="/rider" className="hidden md:inline">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Bike className="h-4 w-4" /> Rider
                </Button>
              </Link>
            )}
            {(roles.includes("admin") || roles.includes("support")) && (
              <Link to="/admin" className="hidden md:inline">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Shield className="h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            {user ? (
              <>
                <Link to="/account/profile">
                  <Button variant="ghost" size="icon"><User className="h-4 w-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => nav({ to: "/auth/login" })}>Sign in</Button>
            )}
            <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t bg-card md:hidden">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-1 p-2">
              {navItems.map((it) => (
                <Link key={it.to} to={it.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">
                  {it.label}
                </Link>
              ))}
              {roles.includes("seller") && <Link to="/seller" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Seller</Link>}
              {roles.includes("rider") && <Link to="/rider" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Rider</Link>}
              {(roles.includes("admin") || roles.includes("support")) && <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Admin</Link>}
              <Link to="/orders" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">My Orders</Link>
              <Link to="/account/addresses" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Addresses</Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
        Soko · Buy local, deliver fast
      </footer>
    </div>
  );
}
