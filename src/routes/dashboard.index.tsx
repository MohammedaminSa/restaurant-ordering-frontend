import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { getMenuItems, getCategories, getKitchenOrders, getTables, type User, type MenuItem, type Category, type PlacedOrder, type WaiterTable } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/api";
import { fmt } from "@/lib/cart";
import {
  ChefHat, Users, DollarSign, Settings, ArrowRight,
  LayoutDashboard, UtensilsCrossed, Table as TableIcon,
  TrendingUp, ShoppingBag, ClipboardList, UserCheck,
  Clock, AlertCircle, CheckCircle2
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

const roleCards = [
  {
    role: "kitchen_staff" as User['role'],
    icon: ChefHat,
    title: "Kitchen Dashboard",
    description: "View incoming orders, update preparation status, and manage the kitchen workflow.",
    to: "/dashboard/kitchen",
  },
  {
    role: "waiter" as User['role'],
    icon: Users,
    title: "Waiter Dashboard",
    description: "Manage tables, view active orders, and mark orders as served.",
    to: "/dashboard/waiter",
  },
  {
    role: "cashier" as User['role'],
    icon: DollarSign,
    title: "Cashier Dashboard",
    description: "Process payments, manage bills, and view transaction history.",
    to: "/dashboard/cashier",
  },
];

function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const userRole = user.role as User['role'];
  const isAdmin = userRole === "super_admin" || userRole === "restaurant_admin";

  const itemsQuery = useQuery({
    queryKey: ["overview-menu-items", user?.restaurant_id],
    queryFn: () => getMenuItems({ restaurantId: user?.restaurant_id }),
    enabled: !!user && isAdmin,
  });

  const catsQuery = useQuery({
    queryKey: ["overview-categories", user?.restaurant_id],
    queryFn: () => getCategories(user?.restaurant_id),
    enabled: !!user && isAdmin,
  });

  const ordersQuery = useQuery({
    queryKey: ["overview-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user && isAdmin,
  });

  const tablesQuery = useQuery({
    queryKey: ["overview-tables", user?.restaurant_id],
    queryFn: () => getTables(user?.restaurant_id),
    enabled: !!user && isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">
            Welcome, {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {ROLE_LABELS[userRole]}
            </span>
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {roleCards
            .filter((card) => card.role === userRole)
            .map((card) => (
              <Link
                key={card.role}
                to={card.to as any}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <card.icon className="h-6 w-6 text-accent" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                </div>
                <h3 className="mt-4 font-serif text-xl text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {card.description}
                </p>
              </Link>
            ))}
        </div>
      </div>
    );
  }

  const items = (itemsQuery.data?.data || []) as MenuItem[];
  const categories = (catsQuery.data?.data || []) as Category[];
  const orders = (ordersQuery.data?.data || []) as PlacedOrder[];

  const availableItems = items.filter((i) => i.is_available);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const servedOrders = orders.filter((o) => o.status === "served");

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || "0"), 0);
  const tables = (tablesQuery.data?.data || []) as WaiterTable[];
  const totalTables = tables.length;

  const statusData = [
    { label: "Pending", value: pendingOrders.length, color: "bg-amber-500" },
    { label: "Preparing", value: preparingOrders.length, color: "bg-orange-500" },
    { label: "Ready", value: readyOrders.length, color: "bg-emerald-500" },
    { label: "Served", value: servedOrders.length, color: "bg-blue-500" },
  ];
  const maxStatus = Math.max(...statusData.map((d) => d.value), 1);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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
      <div>
        <h1 className="font-serif text-3xl text-foreground">
          Welcome, {user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {ROLE_LABELS[userRole]}
          </span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Menu Items</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{items.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{availableItems.length} available</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <UtensilsCrossed className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tables</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{totalTables}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <TableIcon className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{orders.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{pendingOrders.length} pending</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <ShoppingBag className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmt(totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{orders.length} orders</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Status */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-accent" />
            Order Status Overview
          </h2>
          <div className="space-y-4">
            {statusData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${(item.value / maxStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center text-sm">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingOrders.length}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Pending</p>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-3">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{preparingOrders.length}</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70">Preparing</p>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{readyOrders.length}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Ready</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{servedOrders.length}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Served</p>
            </div>
          </div>
        </div>

        {/* Menu by Category */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-accent" />
            Menu by Category
          </h2>
          <div className="space-y-4">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No categories yet</p>
            ) : (
              categories.map((cat) => {
                const count = items.filter((i) => i.category_id === cat.id).length;
                const maxCat = Math.max(...categories.map((c) => items.filter((i) => i.category_id === c.id).length), 1);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">{cat.name}</span>
                      <span className="text-muted-foreground">{count} items</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(count / maxCat) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{categories.length} categories · {items.length} total items</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Recent Orders
          </h2>
          <Link
            to="/dashboard/admin/orders"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              No orders yet
            </div>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    order.status === "pending" ? "bg-amber-50 dark:bg-amber-950/30" :
                    order.status === "preparing" ? "bg-orange-50 dark:bg-orange-950/30" :
                    order.status === "ready" ? "bg-emerald-50 dark:bg-emerald-950/30" :
                    "bg-blue-50 dark:bg-blue-950/30"
                  }`}>
                    <span className={`text-xs font-bold ${
                      order.status === "pending" ? "text-amber-600 dark:text-amber-400" :
                      order.status === "preparing" ? "text-orange-600 dark:text-orange-400" :
                      order.status === "ready" ? "text-emerald-600 dark:text-emerald-400" :
                      "text-blue-600 dark:text-blue-400"
                    }`}>
                      #{order.order_number}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {order.items.map((i) => i.menu_item_name || i.item_name).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.items.length} item(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{getTimeAgo(order.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
