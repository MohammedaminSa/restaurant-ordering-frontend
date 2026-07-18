import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getKitchenOrders } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/cart";
import {
  ClipboardList,
  Clock,
  Flame,
  CheckCircle2,
  ChefHat,
  Loader2,
  TrendingUp,
  Bell,
  ArrowRight,
  Timer,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/kitchen/")({
  component: KitchenOverview,
});

function KitchenOverview() {
  const user = useAuthStore((s) => s.user);

  const ordersQuery = useQuery({
    queryKey: ["kitchen-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const orders = (ordersQuery.data?.data || []) as any[];

  const pending = orders.filter((o: any) => o.status === "pending");
  const preparing = orders.filter((o: any) => o.status === "preparing");
  const ready = orders.filter((o: any) => o.status === "ready");

  const totalItems = orders.reduce((sum: number, o: any) => sum + (o.items?.length || 0), 0);
  const avgPrepTime = preparing.length > 0
    ? Math.round(preparing.reduce((sum: number, o: any) => sum + (o.estimated_prep_time || 0), 0) / preparing.length)
    : 0;

  const recent = [...orders]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getTimeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  if (ordersQuery.isError) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600 font-medium">Failed to load data</p>
          <Button variant="outline" size="sm" onClick={() => ordersQuery.refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Kitchen Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {orders.length} total orders · {preparing.length} in progress
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pending.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting preparation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Preparing</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{preparing.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In the kitchen</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Ready</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{ready.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to serve</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Completed</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o: any) => o.status === "served").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Served today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-4 w-4" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No orders yet today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-1.5 ${
                          order.status === "pending" ? "bg-amber-50" :
                          order.status === "preparing" ? "bg-orange-50" :
                          "bg-emerald-50"
                        }`}>
                          {order.status === "pending" ? <Clock className="h-4 w-4 text-amber-600" /> :
                           order.status === "preparing" ? <Flame className="h-4 w-4 text-orange-600" /> :
                           <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">#{order.order_number}</span>
                            <span className="text-xs text-muted-foreground">Table {order.table_number}</span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{order.status}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(order.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Items</span>
                <span className="text-sm font-medium">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Orders</span>
                <span className="text-sm font-medium">{preparing.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Prep Time</span>
                <span className="text-sm font-medium">{avgPrepTime > 0 ? `${avgPrepTime} min` : "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="text-sm font-medium">
                  {orders.length > 0
                    ? `${Math.round((orders.filter((o: any) => o.status === "served").length / orders.length) * 100)}%`
                    : "N/A"}
                </span>
              </div>
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
              <Link to="/dashboard/kitchen/orders" className="block">
                <Button variant="default" className="w-full justify-start gap-2">
                  <ClipboardList className="h-4 w-4" />
                  View All Orders
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              <Link to="/dashboard/kitchen/menu" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ChefHat className="h-4 w-4" />
                  Manage Menu Availability
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              {pending.length > 0 && (
                <Link to="/dashboard/kitchen/orders" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <Clock className="h-4 w-4" />
                    {pending.length} Order{pending.length > 1 ? "s" : ""} Pending
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
