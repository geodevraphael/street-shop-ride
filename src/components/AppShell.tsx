import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Store, Home, ShoppingBag, User, Bike, Shield, LogOut, MapPin, Search, Gift,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const items = useCart();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();

  const desktopNav = [
    { to: "/", label: "Nyumbani", icon: Home },
    { to: "/shops", label: "Maduka", icon: Store },
    { to: "/products/search", label: "Tafuta", icon: Search },
    { to: "/cart", label: "Kikapu", icon: ShoppingBag, badge: items.length || undefined },
  ];

  const isActive = (to: string) =>
    to === "/" ? path === "/" : path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/icon-512.png" alt="Soko" className="h-8 w-8 rounded-lg object-cover" />
            <span>Soko</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {desktopNav.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={`relative rounded-md px-3 py-1.5 text-sm transition ${
                  isActive(it.to) ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
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
                <Button variant="ghost" size="sm" className="gap-1.5"><Store className="h-4 w-4" /> Muuzaji</Button>
              </Link>
            )}
            {roles.includes("rider") && (
              <Link to="/rider" className="hidden md:inline">
                <Button variant="ghost" size="sm" className="gap-1.5"><Bike className="h-4 w-4" /> Boda</Button>
              </Link>
            )}
            {(roles.includes("admin") || roles.includes("support")) && (
              <Link to="/admin" className="hidden md:inline">
                <Button variant="ghost" size="sm" className="gap-1.5"><Shield className="h-4 w-4" /> Admin</Button>
              </Link>
            )}
            {user ? (
              <>
                <Link to="/referrals" className="hidden md:inline">
                  <Button variant="ghost" size="sm" className="gap-1.5"><Gift className="h-4 w-4" /> Alika</Button>
                </Link>
                <Link to="/account/profile" className="hidden md:inline">
                  <Button variant="ghost" size="icon" aria-label="Akaunti"><User className="h-4 w-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Toka">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => nav({ to: "/auth/login" })}>Ingia</Button>
            )}
          </div>
        </div>
      </header>

      {/* Add bottom padding on mobile so content isn't hidden behind the bottom nav */}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-6">{children}</main>

      <footer className="hidden border-t py-6 text-center text-xs text-muted-foreground md:block">
        Soko · Nunua karibu nawe
      </footer>

      {/* Mobile bottom navigation */}
      <MobileBottomNav path={path} cartCount={items.length} hasRole={roles} />
    </div>
  );
}

function MobileBottomNav({
  path, cartCount, hasRole,
}: { path: string; cartCount: number; hasRole: string[] }) {
  const accountTo = hasRole.includes("seller")
    ? "/seller"
    : hasRole.includes("rider")
    ? "/rider"
    : hasRole.includes("admin") || hasRole.includes("support")
    ? "/admin"
    : "/account/profile";
  const accountLabel = hasRole.includes("seller")
    ? "Muuzaji"
    : hasRole.includes("rider")
    ? "Boda"
    : hasRole.includes("admin") || hasRole.includes("support")
    ? "Admin"
    : "Akaunti";
  const AccountIcon = hasRole.includes("seller")
    ? Store : hasRole.includes("rider")
    ? Bike : (hasRole.includes("admin") || hasRole.includes("support"))
    ? Shield : User;

  const items = [
    { to: "/", label: "Nyumbani", icon: Home, exact: true },
    { to: "/shops", label: "Maduka", icon: MapPin, exact: false },
    { to: "/products/search", label: "Tafuta", icon: Search, exact: false },
    { to: "/cart", label: "Kikapu", icon: ShoppingBag, exact: false, badge: cartCount || undefined },
    { to: accountTo, label: accountLabel, icon: AccountIcon, exact: false },
  ] as const;

  const isActive = (to: string, exact: boolean) => (exact ? path === to : path === to || path.startsWith(to + "/"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Menyu kuu"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-5">
        {items.map((it) => {
          const active = isActive(it.to, it.exact);
          const Icon = it.icon;
          return (
            <li key={it.to + it.label}>
              <Link
                to={it.to}
                className={`relative flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition ${
                    active ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {"badge" in it && it.badge ? (
                    <span className="absolute right-3 top-1 min-w-[16px] rounded-full bg-primary px-1 text-center text-[9px] font-bold text-primary-foreground">
                      {it.badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
