import { Link } from "@tanstack/react-router";
import { ShoppingBag, UtensilsCrossed, LayoutDashboard, LogOut, UserIcon, ChevronDown, Menu, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuthStore } from "@/lib/auth-store";
import { ROLE_LABELS, ROLE_DASHBOARD, getRestaurantInfo, type User, type RestaurantInfo } from "@/lib/api";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRestaurantInfo().then(r => setRestaurant(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    setMenuOpen(false);
    setMobileNavOpen(false);
  };

  const displayName = restaurant?.name || 'Restaurant';

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-foreground shrink-0">
          {restaurant?.logo_url ? (
            <img src={restaurant.logo_url} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <UtensilsCrossed className="h-5 w-5 text-accent" />
          )}
          <span className="font-serif text-xl">{displayName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
          <Link
            to="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            Menu
          </Link>
          <Link
            to="/orders"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Orders
          </Link>

          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">{user.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card py-2 shadow-lg">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[user.role as User['role']] || user.role}
                    </p>
                  </div>
                  <Link
                    to={ROLE_DASHBOARD[user.role as User['role']] as any || "/dashboard"}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Staff Login
            </Link>
          )}

          <ThemeToggle />

          <Link
            to="/cart"
            className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs font-medium">{count}</span>
          </Link>
        </nav>

        {/* Mobile right section */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/cart"
            className="relative flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-primary-foreground"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs font-medium">{count}</span>
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-accent"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-4 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              activeOptions={{ exact: true }}
            >
              Menu
            </Link>
            <Link
              to="/orders"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              Orders
            </Link>
            {isAuthenticated && user ? (
              <>
                <div className="border-t border-border my-2" />
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role as User['role']] || user.role}
                  </p>
                </div>
                <Link
                  to={ROLE_DASHBOARD[user.role as User['role']] as any || "/dashboard"}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                Staff Login
              </Link>
            )}
            <div className="pt-2 px-3">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
