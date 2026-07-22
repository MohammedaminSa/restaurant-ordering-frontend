import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { getKitchenOrders, updateKitchenOrderStatus } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { fmt } from "@/lib/cart";
import {
  ClipboardList,
  Clock,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Bell,
  Flame,
  Utensils,
  Timer,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/kitchen/orders")({
  component: KitchenOrders,
});

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  confirmed: { label: "Payment Approved", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", dot: "bg-amber-500" },
  pending: { label: "Pending", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/30", dot: "bg-gray-500" },
  preparing: { label: "Preparing", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", dot: "bg-orange-500" },
  ready: { label: "Ready", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500" },
  served: { label: "Served", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", dot: "bg-blue-500" },
};

function getUrgency(createdAt: string): { level: "normal" | "warning" | "critical"; label: string } {
  const m = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (m >= 20) return { level: "critical", label: `${m}m ago` };
  if (m >= 10) return { level: "warning", label: `${m}m ago` };
  return { level: "normal", label: `${m}m ago` };
}

function getTimeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function KitchenOrders() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const prevCountRef = useRef(0);
  const [newAlert, setNewAlert] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kitchen-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 8000,
  });

  const orders = (data?.data || []) as any[];

  useEffect(() => {
    if (prevCountRef.current > 0 && orders.length > prevCountRef.current) {
      setNewAlert(true);
      setTimeout(() => setNewAlert(false), 5000);
    }
    prevCountRef.current = orders.length;
  }, [orders.length]);

  const updateMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      updateKitchenOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success("Order status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update order"),
  });

  const acceptAll = () => {
    orders.filter((o: any) => o.status === "confirmed").forEach((o: any) => {
      updateMutation.mutate({ orderId: o.id, status: "preparing" });
    });
  };

  const counts = {
    all: orders.length,
    confirmed: orders.filter((o: any) => o.status === "confirmed").length,
    preparing: orders.filter((o: any) => o.status === "preparing").length,
    ready: orders.filter((o: any) => o.status === "ready").length,
  };

  let filtered = statusTab === "all" ? orders : orders.filter((o: any) => o.status === statusTab);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((o: any) =>
      o.order_number.toString().includes(q) ||
      String(o.table_number).includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.items?.some((i: any) => (i.menu_item_name || i.item_name)?.toLowerCase().includes(q))
    );
  }
  filtered = [...filtered].sort((a: any, b: any) =>
    sortNewest
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">{orders.length} total · {counts.preparing} in progress</p>
        </div>
        <div className="flex items-center gap-2">
          {newAlert && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 animate-pulse">
              <Bell className="h-4 w-4" />New orders!
            </div>
          )}
          {counts.confirmed > 1 && (
            <Button variant="outline" size="sm" onClick={acceptAll} disabled={updateMutation.isPending}>
              Start All ({counts.confirmed})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: "All", count: counts.all },
            { key: "confirmed", label: "Payment Approved", count: counts.confirmed },
            { key: "preparing", label: "Preparing", count: counts.preparing },
            { key: "ready", label: "Ready", count: counts.ready },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                statusTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {t.label}
              <span className="text-[10px] opacity-70">{t.count}</span>
            </button>
          ))}
          <button onClick={() => setSortNewest(!sortNewest)} className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" />
            {sortNewest ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>}

      {isError && (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-red-600 font-medium">Failed to load orders</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-serif text-xl text-foreground mb-1">
            {search ? "No matching orders" : statusTab === "all" ? "No orders yet" : statusTab === "confirmed" ? "All payment approved orders processed" : `All ${statusTab} orders cleared`}
          </p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different search" : "Approved orders appear here when payment is verified"}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order: any) => {
            const urgency = getUrgency(order.created_at);
            const cfg = statusConfig[order.status] || statusConfig.pending;
            return (
              <div
                key={order.id}
                className={`rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
                  urgency.level === "critical" && order.status !== "ready" && order.status !== "served"
                    ? "border-red-300 dark:border-red-800"
                    : urgency.level === "warning" && order.status !== "ready" && order.status !== "served"
                    ? "border-amber-300 dark:border-amber-800"
                    : "border-border"
                } ${order.status === "ready" ? "ring-1 ring-emerald-400/50" : ""}`}
              >
                {urgency.level !== "normal" && order.status !== "ready" && order.status !== "served" && (
                  <div className={`h-1 rounded-t-xl ${urgency.level === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg ${cfg.bg} p-2.5`}>
                        {order.status === "confirmed" ? <Clock className={`h-5 w-5 ${cfg.color}`} /> :
                         order.status === "preparing" ? <Flame className={`h-5 w-5 ${cfg.color}`} /> :
                         <CheckCircle2 className={`h-5 w-5 ${cfg.color}`} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-xl text-foreground">#{order.order_number}</h3>
                          {urgency.level !== "normal" && order.status !== "ready" && order.status !== "served" && (
                            <span className={`text-xs font-medium ${urgency.level === "critical" ? "text-red-600" : "text-amber-600"}`}>
                              {urgency.level === "critical" ? "Overdue!" : "Urgent"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          {getTimeAgo(order.created_at)}
                          <span>·</span>
                          <span>Table {order.table_number}</span>
                          {order.customer_name && <><span>·</span><span>{order.customer_name}</span></>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`capitalize ${cfg.bg} ${cfg.color} border-0`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} mr-1`} />
                      {cfg.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">{item.quantity}</span>
                          <span className="text-sm text-foreground font-medium">{item.menu_item_name || item.item_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        Special Instructions
                      </p>
                      <p className="text-sm text-foreground mt-0.5">{order.special_instructions}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {order.status === "confirmed" && (
                      <Button onClick={() => updateMutation.mutate({ orderId: order.id, status: "preparing" })} disabled={updateMutation.isPending} className="flex-1">
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Flame className="h-4 w-4 mr-1" />}
                        Start Preparing
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button onClick={() => updateMutation.mutate({ orderId: order.id, status: "ready" })} disabled={updateMutation.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Mark Ready
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <div className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        <Utensils className="h-4 w-4" />
                        Awaiting Service
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">{order.items?.length || 0} item(s)</span>
                    <span className="font-semibold text-foreground">{fmt(parseFloat(order.total_amount))}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
