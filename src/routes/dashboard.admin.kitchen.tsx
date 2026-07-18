import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getKitchenOrders, getUsers, type PlacedOrder, type User } from "@/lib/api";
import { fmt } from "@/lib/cart";
import {
  ChefHat,
  Clock,
  Loader2,
  UserCheck,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/kitchen")({
  component: AdminKitchen,
});

function AdminKitchen() {
  const user = useAuthStore((s) => s.user);

  const ordersQuery = useQuery({
    queryKey: ["admin-kitchen-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", user?.restaurant_id],
    queryFn: () => getUsers(user?.restaurant_id),
    enabled: !!user,
  });

  const queries = [ordersQuery, usersQuery];
  const anyError = queries.find((q) => q.isError);
  const isError = !!anyError;

  const orders = (ordersQuery.data?.data || []) as PlacedOrder[];
  const staff = (usersQuery.data?.data || []) as User[];
  const kitchenStaff = staff.filter((s) => s.role === "kitchen_staff");
  const kitchenOnline = kitchenStaff.filter((s) => s.is_active);

  const pending = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready");
  const served = orders.filter((o) => o.status === "served");

  const urgentOrders = orders.filter((o) => {
    if (o.status === "served") return false;
    const diff = Date.now() - new Date(o.created_at).getTime();
    return diff > 15 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Kitchen Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor kitchen performance and staff</p>
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
              <p className="text-sm text-muted-foreground">Kitchen Staff</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{kitchenStaff.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kitchenOnline.length} active</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <UserCheck className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{pending.length}</p>
            </div>
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950/30 p-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{preparing.length}</p>
            </div>
            <div className="rounded-lg bg-orange-100 dark:bg-orange-950/30 p-3">
              <ChefHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ready to Serve</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{ready.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-3">
              <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {urgentOrders.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">{urgentOrders.length} order{urgentOrders.length > 1 ? "s" : ""} waiting longer than 15 minutes</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground">Recent Orders</h2>
          </div>
          {ordersQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No orders yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      order.status === "pending" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                      order.status === "preparing" ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" :
                      order.status === "ready" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-sm text-muted-foreground">{fmt(parseFloat(order.total_amount))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground">Kitchen Staff</h2>
          </div>
          {kitchenStaff.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No kitchen staff assigned
            </div>
          ) : (
            <div className="divide-y divide-border">
              {kitchenStaff.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.is_active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Orders Today</p>
          <p className="mt-1 font-serif text-2xl text-foreground">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Completed (Served)</p>
          <p className="mt-1 font-serif text-2xl text-foreground">{served.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Avg Time (pending → ready)</p>
          <p className="mt-1 font-serif text-2xl text-foreground">—</p>
        </div>
      </div>
    </div>
  );
}
