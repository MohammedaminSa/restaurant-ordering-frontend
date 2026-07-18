import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { getWaiterTables, getWaiterOrders } from "@/lib/api";
import { UserCheck, Users, ClipboardList, Clock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/waiters")({
  component: AdminWaiters,
});

function AdminWaiters() {
  const user = useAuthStore((s) => s.user);

  const tablesQuery = useQuery({
    queryKey: ["admin-waiter-tables", user?.restaurant_id],
    queryFn: () => getWaiterTables(user?.restaurant_id),
    enabled: !!user,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-waiter-orders", user?.restaurant_id],
    queryFn: () => getWaiterOrders(user?.restaurant_id),
    enabled: !!user,
  });

  const tables = tablesQuery.data?.data || [];
  const orders = ordersQuery.data?.data || [];

  const activeTables = tables.filter((t: any) => t.status === "occupied" || t.status === "active");
  const pendingServed = orders.filter((o: any) => o.status === "ready" && !o.is_served);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Waiters</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor waiter activity and assigned tables</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Tables</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{activeTables.length}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <Users className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Orders Ready to Serve</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{pendingServed.length}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <ClipboardList className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tables</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{tables.length}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <UserCheck className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-serif text-lg text-foreground">Table Status</h2>
        </div>
        {(tablesQuery.isLoading) ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : tables.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            No tables configured yet
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table: any) => (
              <div
                key={table.id}
                className={`rounded-lg border p-4 ${
                  table.status === "occupied" || table.status === "active"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Table {table.table_number}</span>
                  <span className={`text-xs font-medium capitalize ${
                    table.status === "occupied" || table.status === "active"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {table.status === "occupied" || table.status === "active" ? "Occupied" : "Available"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
