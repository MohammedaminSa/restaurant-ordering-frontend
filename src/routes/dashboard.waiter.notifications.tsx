import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getWaiterTables, getWaiterOrders } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Utensils,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Table as TableIcon,
  UserPlus,
  AlertCircle,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/waiter/notifications")({
  component: WaiterNotifications,
});

interface Notification {
  id: string;
  type: "order_ready" | "new_session" | "table_available" | "payment_completed" | "order_update";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

function WaiterNotifications() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [prevReadyIds, setPrevReadyIds] = useState<string[]>([]);
  const [prevSessions, setPrevSessions] = useState<string[]>([]);

  const tablesQuery = useQuery({
    queryKey: ["waiter-tables", user?.restaurant_id],
    queryFn: () => getWaiterTables(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const ordersQuery = useQuery({
    queryKey: ["waiter-orders", user?.restaurant_id],
    queryFn: () => getWaiterOrders(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const tables = tablesQuery.data?.data || [];
  const orders = ordersQuery.data?.data || [];

  const readyOrders = orders.filter((o: any) => o.status === "ready");
  const activeSessions = tables.filter((t: any) => t.session_token).map((t: any) => t.session_token);
  const currentReadyIds = readyOrders.map((o: any) => o.id);

  useEffect(() => {
    const newNotifications: Notification[] = [];

    const newReadyIds = currentReadyIds.filter((id) => !prevReadyIds.includes(id));
    newReadyIds.forEach((id) => {
      const order = readyOrders.find((o: any) => o.id === id);
      if (order) {
        const table = tables.find((t: any) => t.session_token === order.session_token);
        newNotifications.push({
          id: `ready-${id}`,
          type: "order_ready",
          title: "Order Ready to Serve",
          message: `Order #${order.order_number}${table ? ` for Table ${table.table_number}` : ""} is ready to be served`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: "/dashboard/waiter/orders",
          actionLabel: "View Order",
        });
      }
    });

    const newSessions = activeSessions.filter((id) => !prevSessions.includes(id));
    newSessions.forEach((sessionId) => {
      const table = tables.find((t: any) => t.session_token === sessionId);
      if (table && table.customer_name) {
        newNotifications.push({
          id: `session-${sessionId}`,
          type: "new_session",
          title: "New Customer Session",
          message: `${table.customer_name} was seated at Table ${table.table_number}`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: "/dashboard/waiter/tables",
          actionLabel: "View Table",
        });
      }
    });

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }

    setPrevReadyIds(currentReadyIds);
    setPrevSessions(activeSessions);
  }, [currentReadyIds.join(","), activeSessions.join(",")]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order_ready": return <Utensils className="h-4 w-4 text-emerald-500" />;
      case "new_session": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "table_available": return <TableIcon className="h-4 w-4 text-emerald-500" />;
      case "payment_completed": return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
      case "order_update": return <Clock className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filteredNotifications = filter === "all"
    ? notifications
    : notifications.filter((n) => !n.read);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isError = tablesQuery.isError || ordersQuery.isError;
  const isLoading = tablesQuery.isLoading || ordersQuery.isLoading;

  if (isError) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600 font-medium">Failed to load notifications</p>
          <Button variant="outline" size="sm" onClick={() => { tablesQuery.refetch(); ordersQuery.refetch(); }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "No new notifications"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
              queryClient.invalidateQueries({ queryKey: ["waiter-orders"] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
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
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            {f.label}
            <span className="text-[10px]">{f.count}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      )}

      {!isLoading && filteredNotifications.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-4">
              <Bell className="h-12 w-12 text-muted-foreground/40" />
            </div>
          </div>
          <h2 className="font-serif text-xl text-foreground mb-1">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filter === "unread"
              ? "All caught up!"
              : "Notifications will appear here when orders are ready or customers are seated"}
          </p>
        </div>
      )}

      {!isLoading && filteredNotifications.length > 0 && (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-sm ${!notification.read ? "border-l-4 border-l-accent" : ""}`}
              onClick={() => markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2 shrink-0">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${notification.read ? "text-foreground" : "font-semibold text-foreground"}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="rounded-full p-1 text-muted-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {notification.actionUrl && (
                      <div className="mt-2">
                        <Link
                          to={notification.actionUrl as any}
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {notification.actionLabel || "View"}
                        </Link>
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
