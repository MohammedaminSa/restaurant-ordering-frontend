import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getUsers, getTodayTransactions, getActiveSessions, type User } from "@/lib/api";
import { fmt } from "@/lib/cart";
import {
  DollarSign,
  Loader2,
  UserCheck,
  ClipboardList,
  TrendingUp,
  History,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/cashiers")({
  component: AdminCashiers,
});

function AdminCashiers() {
  const user = useAuthStore((s) => s.user);

  const usersQuery = useQuery({
    queryKey: ["admin-users", user?.restaurant_id],
    queryFn: () => getUsers(user?.restaurant_id),
    enabled: !!user,
  });

  const revenueQuery = useQuery({
    queryKey: ["admin-revenue-today", user?.restaurant_id],
    queryFn: () => getTodayTransactions(user?.restaurant_id),
    enabled: !!user,
  });

  const activeSessionsQuery = useQuery({
    queryKey: ["admin-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const queries = [usersQuery, revenueQuery, activeSessionsQuery];
  const anyError = queries.find((q) => q.isError);
  const isError = !!anyError;

  const staff = (usersQuery.data?.data || []) as User[];
  const revenue = revenueQuery.data?.data;
  const activeSessions = activeSessionsQuery.data?.data || [];

  const cashiers = staff.filter((s) => s.role === "cashier");
  const totalRevenue = revenue ? parseFloat(revenue.summary?.total_amount || "0") : 0;
  const txCount = revenue ? revenue.summary?.transaction_count || 0 : 0;
  const paymentsByMethod = revenue ? revenue.summary?.by_payment_method || {} : {};
  const avgPerTx = txCount > 0 ? totalRevenue / txCount : 0;

  const totalFromPayments = Object.values(paymentsByMethod as Record<string, number>).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Cashiers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor cashier activity and payments</p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load some data: {(anyError?.error as any)?.message || "Check console for details"}
        </div>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cashiers</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{cashiers.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{cashiers.filter((c) => c.is_active).length} active</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <UserCheck className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{activeSessions.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">currently dining</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <History className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Revenue</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmt(totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{txCount} transactions</p>
            </div>
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-3">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Checkouts</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{activeSessions.length}</p>
            </div>
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950/30 p-3">
              <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground">Cashier Staff</h2>
          </div>
          {cashiers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No cashiers assigned
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cashiers.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.is_active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground">Revenue by Payment Method</h2>
          </div>
          <div className="p-5">
            {Object.keys(paymentsByMethod).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payment data yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(paymentsByMethod as Record<string, number>).map(([method, amount]) => {
                  const pct = totalFromPayments > 0 ? (amount / totalFromPayments) * 100 : 0;
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium capitalize">{method.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{fmt(amount)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Today's Summary
          </h2>
        </div>
        <div className="grid gap-4 p-5 grid-cols-1 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="font-serif text-2xl text-foreground">{fmt(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="font-serif text-2xl text-foreground">{txCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg per Transaction</p>
            <p className="font-serif text-2xl text-foreground">{fmt(avgPerTx)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
