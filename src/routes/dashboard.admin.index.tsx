import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getMenuItems, getCategories, getKitchenOrders, getUsers, getTables, getTodayTransactions, getActiveSessions, getRestaurants, type MenuItem, type Category, type PlacedOrder, type User, type WaiterTable, type Restaurant } from "@/lib/api";
import { fmt } from "@/lib/cart";
import {
  UtensilsCrossed,
  Table as TableIcon,
  Users,
  ChefHat,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Loader2,
  Building2,
  Shield,
  Clock,
  UserPlus,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const user = useAuthStore((s) => s.user);

  // Super Admin view
  if (user?.role === "super_admin") {
    return <SuperAdminOverview />;
  }

  // Restaurant Admin view (existing)
  return <RestaurantAdminOverview user={user} />;
}

function SuperAdminOverview() {
  const { data: restaurantsData, isLoading: restaurantsLoading, isError: restaurantsError } = useQuery({
    queryKey: ["super-admin-restaurants"],
    queryFn: () => getRestaurants(),
  });

  const { data: adminsData, isLoading: adminsLoading, isError: adminsError } = useQuery({
    queryKey: ["super-admin-admins"],
    queryFn: () => getUsers(undefined, "restaurant_admin"),
  });

  const restaurants = (restaurantsData?.data || []) as Restaurant[];
  const admins = (adminsData?.data || []) as User[];
  const activeRestaurants = restaurants.filter((r) => r.is_active);
  const recentRestaurants = [...restaurants].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  const isLoading = restaurantsLoading || adminsLoading;
  const isError = restaurantsError || adminsError;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl text-foreground">Platform Overview</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load platform data. Check console for details.
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
        <h1 className="font-serif text-3xl text-foreground">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Super admin dashboard</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Restaurants</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{restaurants.length}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Restaurants</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{activeRestaurants.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{restaurants.length - activeRestaurants.length} inactive</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Admins</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{admins.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">restaurant administrators</p>
            </div>
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Shield className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Admins / Restaurant</p>
              <p className="mt-1 font-serif text-3xl text-foreground">
                {restaurants.length > 0 ? (admins.length / restaurants.length).toFixed(1) : "0"}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            Recently Added Restaurants
          </h2>
          {recentRestaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No restaurants yet</p>
          ) : (
            <div className="divide-y divide-border">
              {recentRestaurants.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.address || "No address"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                      r.is_active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    }`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-sm">
            <Link
              to="/dashboard/admin/restaurants"
              className="flex items-center gap-1 text-accent hover:underline"
            >
              View all restaurants <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" />
            Recent Activities
          </h2>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No admin accounts yet</p>
          ) : (
            <div className="space-y-3">
              {admins.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 text-xs font-bold">
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(a.created_at || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-sm">
            <Link
              to="/dashboard/admin/users"
              className="flex items-center gap-1 text-accent hover:underline"
            >
              View all admins <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RestaurantAdminOverview({ user }: { user: any }) {
  const itemsQuery = useQuery({
    queryKey: ["admin-menu-items", user?.restaurant_id],
    queryFn: () => getMenuItems({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
  });

  const catsQuery = useQuery({
    queryKey: ["admin-categories", user?.restaurant_id],
    queryFn: () => getCategories(user?.restaurant_id),
    enabled: !!user,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", user?.restaurant_id],
    queryFn: () => getKitchenOrders({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 15000,
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

  const revenueQuery = useQuery({
    queryKey: ["admin-revenue-today", user?.restaurant_id],
    queryFn: () => getTodayTransactions(user?.restaurant_id),
    enabled: !!user,
  });

  const items = (itemsQuery.data?.data || []) as MenuItem[];
  const categories = (catsQuery.data?.data || []) as Category[];
  const orders = (ordersQuery.data?.data || []) as PlacedOrder[];
  const staff = (usersQuery.data?.data || []) as User[];
  const tables = (tablesQuery.data?.data || []) as WaiterTable[];
  const activeSessions = activeSessionsQuery.data?.data || [];
  const revenue = revenueQuery.data?.data;

  const availableItems = items.filter((i) => i.is_available);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const activeTables = tables.filter((t) => t.status === "occupied");
  const revenueToday = revenue ? parseFloat(revenue.summary?.total_amount || "0") : 0;
  const transactionsToday = revenue ? revenue.summary?.transaction_count || 0 : 0;

  const waiters = staff.filter((s) => s.role === "waiter");
  const cashiers = staff.filter((s) => s.role === "cashier");
  const kitchenStaff = staff.filter((s) => s.role === "kitchen_staff");
  const admins = staff.filter((s) => s.role === "restaurant_admin" || s.role === "super_admin");

  const queries = [itemsQuery, usersQuery, tablesQuery, ordersQuery, activeSessionsQuery, revenueQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const anyError = queries.find((q) => q.isError);
  const dataError = !!anyError;

  const statusData = [
    { label: "Pending", value: pendingOrders.length, color: "bg-amber-500" },
    { label: "Preparing", value: preparingOrders.length, color: "bg-orange-500" },
    { label: "Ready", value: readyOrders.length, color: "bg-emerald-500" },
  ];
  const maxStatus = Math.max(...statusData.map((d) => d.value), 1);

  const managementCards = [
    { label: "Menu Items", count: items.length, icon: UtensilsCrossed, to: "/dashboard/admin/menu-items", desc: "Manage dishes and categories" },
    { label: "Tables", count: tables.length, icon: TableIcon, to: "/dashboard/admin/tables", desc: "Configure table layout" },
    { label: "Staff", count: staff.length, icon: Users, to: "/dashboard/admin/users", desc: "Manage staff accounts" },
  ];

  if (dataError) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl text-foreground">Admin</h1>
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
        <h1 className="font-serif text-3xl text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Restaurant management overview</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Menu Items</p>
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
              <p className="text-sm text-muted-foreground">Tables</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{tables.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{activeTables.length} occupied</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <TableIcon className="h-5 w-5 text-accent" />
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
              <ShoppingBag className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Revenue</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{fmt(revenueToday)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{transactionsToday} transactions</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Staff by Role
          </h2>
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No staff accounts yet</p>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Waiters", value: waiters.length, color: "bg-blue-500" },
                { label: "Cashiers", value: cashiers.length, color: "bg-emerald-500" },
                { label: "Kitchen Staff", value: kitchenStaff.length, color: "bg-orange-500" },
                { label: "Admins", value: admins.length, color: "bg-purple-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${(item.value / Math.max(staff.length, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            {staff.length} total staff members
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-accent" />
            Order Status
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
          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
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
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
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

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {managementCards.map((card) => (
          <Link
            key={card.to}
            to={card.to as any}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-accent/10 p-3">
                <card.icon className="h-5 w-5 text-accent" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
            </div>
            <p className="mt-3 font-serif text-lg text-foreground">{card.label}</p>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
            <p className="mt-1 text-xs text-accent">{card.count} total</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
