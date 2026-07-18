import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getKitchenOrders } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  ClipboardList,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  Utensils,
  ChefHat,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/kitchen/notifications")({
  component: KitchenNotifications,
});

interface KNotification {
  id: string;
  type: "new_order" | "order_ready" | "order_urgent" | "order_modification" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

function KitchenNotifications() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<KNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [prevOrderIds, setPrevOrderIds] = useState<string[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kitchen-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const orders = (data?.data || []) as any[];
  const currentIds = orders.map((o: any) => o.id);

  useEffect(() => {
    const newNotes: KNotification[] = [];

    const newIds = currentIds.filter((id) => !prevOrderIds.includes(id));
    newIds.forEach((id) => {
      const order = orders.find((o: any) => o.id === id);
      if (order) {
        const m = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
        newNotes.push({
          id: `new-${id}`,
          type: m >= 15 ? "order_urgent" : "new_order",
          title: m >= 15 ? "Urgent Order" : "New Order",
          message: `Order #${order.order_number} — Table ${order.table_number}${order.customer_name ? ` (${order.customer_name})` : ""}${m >= 15 ? " — waiting over 15 minutes!" : ""}`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: "/dashboard/kitchen/orders",
        });
      }
    });

    if (newNotes.length > 0) setNotifications((prev) => [...newNotes, ...prev]);
    setPrevOrderIds(currentIds);
  }, [currentIds.join(",")]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "new_order": return <ClipboardList className="h-4 w-4 text-amber-500" />;
      case "order_ready": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "order_urgent": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "order_modification": return <Flame className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  const filtered = filter === "all" ? notifications : notifications.filter((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount > 0 ? `${unreadCount} unread` : "No new notifications"}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllRead}>Mark All Read</Button>}
          {notifications.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll}>Clear All</Button>}
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] })}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-1">
        {[
          { value: "all" as const, label: "All", count: notifications.length },
          { value: "unread" as const, label: "Unread", count: unreadCount },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
              filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            {f.label}<span className="text-[10px]">{f.count}</span>
          </button>
        ))}
      </div>

      {isError && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-foreground">Failed to load orders</p>
        </div>
      )}

      {!isError && isLoading && <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>}

      {!isError && !isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-serif text-xl text-foreground mb-1">
            {filter === "unread" ? "All caught up!" : "No notifications yet"}
          </p>
          <p className="text-sm text-muted-foreground">Notifications appear here when new orders arrive</p>
        </div>
      )}

      {!isError && !isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className={`transition-all hover:shadow-sm ${!n.read ? "border-l-4 border-l-accent" : ""}`} onClick={() => markRead(n.id)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2 shrink-0">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${n.read ? "text-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{getTimeAgo(n.timestamp)}</span>
                    </div>
                    {n.actionUrl && (
                      <div className="mt-2">
                        <Link to={n.actionUrl as any} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline" onClick={(e) => e.stopPropagation()}>View Orders</Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
