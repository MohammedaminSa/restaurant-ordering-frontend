import { Link } from "@tanstack/react-router";
import { ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { count } = useCart();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <UtensilsCrossed className="h-5 w-5 text-accent" />
          <span className="font-serif text-xl">Olivera</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>
            Menu
          </Link>
          {user ? (
            <>
              <Link to="/orders" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Orders
              </Link>
              <button onClick={() => supabase.auth.signOut()} className="text-muted-foreground transition-colors hover:text-foreground">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
          )}
          <Link to="/cart" className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground transition-transform hover:scale-[1.03]">
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs font-medium">{count}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
