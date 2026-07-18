import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getKitchenOrders, type PlacedOrder } from "@/lib/api";
import { fmt } from "@/lib/cart";
import {
  ClipboardList,
  Clock,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<PlacedOrder | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const orders = (data?.data || []) as PlacedOrder[];

  const filtered = orders.filter((o) => {
    const matchSearch = !search || String(o.order_number).includes(search) || o.items.some((i) => (i.menu_item_name || i.item_name || "").toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      preparing: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
      ready: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
      served: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    };
    return styles[status] || "bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} total orders
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="relative w-full sm:w-auto">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground appearance-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
          </select>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Pending", count: orders.filter((o) => o.status === "pending").length, color: "text-amber-600 dark:text-amber-400" },
          { label: "Preparing", count: orders.filter((o) => o.status === "preparing").length, color: "text-orange-600 dark:text-orange-400" },
          { label: "Ready", count: orders.filter((o) => o.status === "ready").length, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Served", count: orders.filter((o) => o.status === "served").length, color: "text-blue-600 dark:text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setStatusFilter(s.label.toLowerCase())}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-serif text-3xl ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load orders: {(error as any)?.message || "Unknown error"}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Order</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Items</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Time</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    {search || statusFilter !== "all" ? "No orders match your filters" : "No orders yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="bg-card hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">#{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {order.items.slice(0, 3).map((item) => (
                          <span key={item.id} className="text-muted-foreground text-xs">
                            {item.quantity}x {item.menu_item_name || item.item_name}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-xs text-muted-foreground/60">+{order.items.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {getTimeAgo(order.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {fmt(parseFloat(order.total_amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">Order #{selectedOrder.order_number}</h2>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(selectedOrder.status)}`}>
                {selectedOrder.status}
              </span>
            </div>
            <div className="space-y-3 mb-4">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.menu_item_name || item.item_name}</p>
                    {item.special_instructions && <p className="text-xs text-muted-foreground mt-0.5">Note: {item.special_instructions}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{item.quantity}x</p>
                    <p className="text-xs text-muted-foreground">{fmt(parseFloat(item.total_price))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {getTimeAgo(selectedOrder.created_at)}
              </div>
              <p className="font-serif text-lg text-foreground">{fmt(parseFloat(selectedOrder.total_amount))}</p>
            </div>
            {selectedOrder.special_instructions && (
              <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">Order Notes:</p>
                <p>{selectedOrder.special_instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
