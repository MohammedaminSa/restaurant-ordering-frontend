import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  UtensilsCrossed,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { getRestaurantInfo, ROLE_DASHBOARD, ROLE_LABELS, type User } from "@/lib/api";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("Restaurant");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('restaurantId') || undefined;
    getRestaurantInfo(rid).then(r => setRestaurantName(r.data?.name || 'Restaurant')).catch(() => {});
  }, []);

  // If already authenticated, redirect to dashboard (via useEffect, NOT during render)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      const target = ROLE_DASHBOARD[user.role as User['role']] || "/";
      navigate({ to: target, replace: true });
    }
  }, [mounted, isAuthenticated, user, navigate]);

  if (isAuthenticated && user) {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setBusy(true);
    try {
      await login(email, password);
      const currentUser = useAuthStore.getState().user;
      toast.success(`Welcome back, ${currentUser?.name || currentUser?.email}!`);
      const target = ROLE_DASHBOARD[(currentUser?.role || 'waiter') as User['role']] || "/dashboard";
      navigate({ to: target, replace: true });
    } catch (err: any) {
      const msg = err.message || "Invalid email or password";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 text-accent"
        >
          <UtensilsCrossed className="h-5 w-5" />
          <span className="font-serif text-xl text-foreground">{restaurantName}</span>
        </Link>

        <h1 className="text-center font-serif text-2xl text-card-foreground">
          Staff Login
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Sign in to access the staff dashboard
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring"
              disabled={busy}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>



        <p className="mt-6 text-center text-xs text-muted-foreground">
          For customer orders, scan the QR code at your table
        </p>
      </div>
    </div>
  );
}
