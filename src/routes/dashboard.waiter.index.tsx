import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getWaiterTables, getWaiterOrders } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/cart";
import {
  Table as TableIcon,
  Users,
  ClipboardList,
  Utensils,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  Bell,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/waiter/")({
  component: WaiterOverview,
});

function WaiterOverview() {
  const user = useAuthStore((s) => s.user);

  const tablesQuery = useQuery({
    queryKey: ["waiter-tables", user?.restaurant_id],
    queryFn: () => getWaiterTables(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const ordersQuery = useQuery({
    queryKey: ["waiter-orders", user?.restaurant_id],
    queryFn: () => getWaiterOrders(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const tables = tablesQuery.data?.data || [];
  const orders = ordersQuery.data?.data || [];

  const assignedTables = tables.length;
  const activeTables = tables.filter((t) => t.status === "occupied").length;
  const activeSessions = tables.filter((t) => t.session_token).length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const preparingOrders = orders.filter((o) => o.status === "preparing").length;
  const readyOrders = orders.filter((o) => o.status === "ready");
  const servedOrders = orders.filter((o) => o.status === "served").length;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statusSummary = [
    { label: "Pending", count: pendingOrders, color: "bg-amber-500" },
    { label: "Preparing", count: preparingOrders, color: "bg-orange-500" },
    { label: "Ready", count: readyOrders.length, color: "bg-emerald-500" },
    { label: "Served", count: servedOrders, color: "bg-blue-500" },
  ];

  const isError = tablesQuery.isError || ordersQuery.isError;
  const isLoading = tablesQuery.isLoading || ordersQuery.isLoading;

  if (isError) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600 font-medium">Failed to load data</p>
          <Button variant="outline" size="sm" onClick={() => { tablesQuery.refetch(); ordersQuery.refetch(); }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
      case "preparing": return "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
      case "ready": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
      case "served": return "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user?.name || "Waiter"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Assigned Tables</CardTitle>
            <TableIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Active Tables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{activeTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Active Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pending Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Ready to Serve</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{readyOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servedOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No orders yet today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => {
                    const table = tables.find((t) => t.session_token === order.session_token);
                    return (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-1.5 ${statusColor(order.status)}`}>
                            {order.status === "ready" ? (
                              <Utensils className="h-4 w-4" />
                            ) : (
                              <ClipboardList className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">#{order.order_number}</span>
                              {table && (
                                <span className="text-xs text-muted-foreground">
                                  Table {table.table_number}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">{order.status}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statusSummary.map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                        <span className="text-sm">{s.label}</span>
                      </div>
                      <span className="text-sm font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/dashboard/waiter/orders" className="block">
                <Button variant="default" className="w-full justify-start gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create New Order
                </Button>
              </Link>
              <Link to="/dashboard/waiter/tables" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <TableIcon className="h-4 w-4" />
                  View Tables
                </Button>
              </Link>
              {readyOrders.length > 0 && (
                <Link to="/dashboard/waiter/orders" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <Utensils className="h-4 w-4" />
                    Serve Ready Orders ({readyOrders.length})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
