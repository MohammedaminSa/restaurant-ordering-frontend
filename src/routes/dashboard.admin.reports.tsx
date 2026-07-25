import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getTodayTransactions, getKitchenOrders, getMenuItems, getUsers, getTables, getActiveSessions, type PlacedOrder } from "@/lib/api";
import { fmt } from "@/lib/cart";
import {
  TrendingUp,
  DollarSign,
  Loader2,
  ClipboardList,
  ShoppingBag,
  Users as UsersIcon,
  Table as TableIcon,
  ArrowUp,
} from "lucide-react";
import {
  PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/dashboard/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const user = useAuthStore((s) => s.user);

  const revenueQuery = useQuery({
    queryKey: ["admin-revenue-today", user?.restaurant_id],
    queryFn: () => getTodayTransactions(user?.restaurant_id),
    enabled: !!user,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-menu-items", user?.restaurant_id],
    queryFn: () => getMenuItems({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", user?.restaurant_id],
    queryFn: () => getUsers(user?.restaurant_id),
    enabled: !!user,
  });

  const tablesQuery = useQuery({
    queryKey: ["admin-tables", user?.restaurant_id],
    queryFn: () => getTables(user?.restaurant_id),
    enabled: !!user,
  });

  const activeSessionsQuery = useQuery({
    queryKey: ["admin-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const revenue = revenueQuery.data?.data;
  const orders = (ordersQuery.data?.data || []) as PlacedOrder[];
  const items = (itemsQuery.data?.data || []) as any[];
  const staff = (usersQuery.data?.data || []) as any[];
  const tables = (tablesQuery.data?.data || []) as any[];
  const activeSessions = activeSessionsQuery.data?.data || [];

  const totalRevenue = revenue ? parseFloat(revenue.summary?.total_amount || "0") : 0;
  const txCount = revenue ? revenue.summary?.transaction_count || 0 : 0;
  const paymentsByMethod = (revenue ? revenue.summary?.by_payment_method : {}) as Record<string, number>;
  const revenuePerTx = txCount > 0 ? totalRevenue / txCount : 0;

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const servedOrders = orders.filter((o) => o.status === "served");

  const activeTables = tables.filter((t: any) => t.status === "occupied");
  const totalFromPayments = Object.values(paymentsByMethod).reduce((a, b) => a + b, 0);

  const queries = [revenueQuery, ordersQuery, itemsQuery, usersQuery, tablesQuery, activeSessionsQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const anyError = queries.find((q) => q.isError);
  const isError = !!anyError;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl text-foreground">Reports</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load some data: {(anyError?.error as any)?.message || "Check console for details"}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Today's performance overview</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmt(totalRevenue)}</p>
              <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                Today's total
              </p>
            </div>
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-3">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{txCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmt(revenuePerTx)} avg</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <ClipboardList className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Orders Today</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{orders.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{servedOrders.length} served</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <ShoppingBag className="h-5 w-5 text-accent" />
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
              <UsersIcon className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent" />
              Revenue by Payment Method
            </h2>
          </div>
          <div className="p-5">
            {Object.keys(paymentsByMethod).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payment data yet</p>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={Object.entries(paymentsByMethod).map(([method, amount]) => ({
                        name: method.replace(/_/g, " "),
                        value: amount,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {Object.entries(paymentsByMethod).map(([method], index) => (
                        <Cell key={method} fill={["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => fmt(value)} />
                  </PieChart>
                </ResponsiveContainer>
                {Object.entries(paymentsByMethod).map(([method, amount]) => {
                  const pct = totalFromPayments > 0 ? (amount / totalFromPayments) * 100 : 0;
                  return (
                    <div key={method} className="flex items-center justify-between text-sm">
                      <span className="text-foreground capitalize">{method.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">{fmt(amount)} ({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Order Status Breakdown
            </h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "Pending", value: pendingOrders.length },
                { name: "Preparing", value: preparingOrders.length },
                { name: "Ready", value: readyOrders.length },
                { name: "Served", value: servedOrders.length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#f59e0b" />
                  <Cell fill="#f97316" />
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-serif text-lg text-foreground">Restaurant Summary</h2>
        </div>
        <div className="grid gap-4 p-5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <UsersIcon className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-2 font-serif text-2xl text-foreground">{staff.length}</p>
            <p className="text-xs text-muted-foreground">Total Staff</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <TableIcon className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-2 font-serif text-2xl text-foreground">{tables.length}</p>
            <p className="text-xs text-muted-foreground">Tables</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <ShoppingBag className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-2 font-serif text-2xl text-foreground">{items.length}</p>
            <p className="text-xs text-muted-foreground">Menu Items</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-2 font-serif text-2xl text-foreground">{orders.length + activeSessions.length}</p>
            <p className="text-xs text-muted-foreground">Sessions (est.)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
