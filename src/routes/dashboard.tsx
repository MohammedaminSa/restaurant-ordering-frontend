import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { getRestaurantInfo, ROLE_LABELS, type User } from "@/lib/api";
import {
  LayoutDashboard,
  ChefHat,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Loader2,
  ShoppingBag,
  UtensilsCrossed,
  Bell,
  Utensils,
  Table as TableIcon,
  ClipboardList,
  UserCog,
  UserCheck,
  History,
  TrendingUp,
  ListTodo,
  MessageSquare,
  Menu,
  X,
  Building2,
  Shield,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const roleIcons: Record<User['role'], typeof ChefHat> = {
  super_admin: Settings,
  restaurant_admin: Settings,
  kitchen_staff: ChefHat,
  waiter: Users,
  cashier: DollarSign,
};

interface NavItem {
  label: string;
  icon: typeof ChefHat;
  to: string;
  roles: User['role'][];
}

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/dashboard/admin", roles: ["super_admin", "restaurant_admin"] },
  { label: "Restaurants", icon: Building2, to: "/dashboard/admin/restaurants", roles: ["super_admin"] },
  { label: "Admins", icon: Shield, to: "/dashboard/admin/users", roles: ["super_admin"] },
  { label: "Users", icon: UserCog, to: "/dashboard/admin/users", roles: ["restaurant_admin"] },
  { label: "Tables", icon: TableIcon, to: "/dashboard/admin/tables", roles: ["restaurant_admin"] },
  { label: "Menu Items", icon: Utensils, to: "/dashboard/admin/menu-items", roles: ["restaurant_admin"] },
  { label: "Orders", icon: ClipboardList, to: "/dashboard/admin/orders", roles: ["restaurant_admin"] },
  { label: "Kitchen", icon: ChefHat, to: "/dashboard/admin/kitchen", roles: ["restaurant_admin"] },
  { label: "Waiters", icon: UserCheck, to: "/dashboard/admin/waiters", roles: ["restaurant_admin"] },
  { label: "Cashiers", icon: DollarSign, to: "/dashboard/admin/cashiers", roles: ["restaurant_admin"] },
  { label: "Reports", icon: TrendingUp, to: "/dashboard/admin/reports", roles: ["restaurant_admin"] },
  { label: "Customization", icon: Smartphone, to: "/dashboard/admin/customization", roles: ["restaurant_admin"] },
  { label: "Settings", icon: Settings, to: "/dashboard/admin/settings", roles: ["super_admin", "restaurant_admin"] },
  { label: "Payment Verification", icon: DollarSign, to: "/dashboard/cashier/checkout", roles: ["cashier"] },
  { label: "Transactions", icon: History, to: "/dashboard/cashier/transactions", roles: ["cashier"] },
  { label: "Settings", icon: Settings, to: "/dashboard/cashier/settings", roles: ["cashier"] },
  { label: "Orders", icon: ClipboardList, to: "/dashboard/waiter/orders", roles: ["waiter"] },
  { label: "Tables", icon: TableIcon, to: "/dashboard/waiter/tables", roles: ["waiter"] },
  { label: "Notifications", icon: Bell, to: "/dashboard/waiter/notifications", roles: ["waiter"] },
  { label: "Settings", icon: Settings, to: "/dashboard/waiter/settings", roles: ["waiter"] },
  { label: "Orders", icon: ClipboardList, to: "/dashboard/kitchen/orders", roles: ["kitchen_staff"] },
  { label: "Menu Availability", icon: Utensils, to: "/dashboard/kitchen/menu", roles: ["kitchen_staff"] },
  { label: "Notifications", icon: Bell, to: "/dashboard/kitchen/notifications", roles: ["kitchen_staff"] },
  { label: "Settings", icon: Settings, to: "/dashboard/kitchen/settings", roles: ["kitchen_staff"] },
];

function DashboardLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Restaurant");

  useEffect(() => {
    getRestaurantInfo().then(r => setRestaurantName(r.data?.name || 'Restaurant')).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate({ to: "/auth", replace: true });
    setSidebarOpen(false);
  };

  const Icon = roleIcons[user.role as User['role']] || LayoutDashboard;
  const filteredNav = navItems.filter((item) => item.roles.includes(user.role as User['role']));

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/15 px-4 lg:px-6">
        <UtensilsCrossed className="h-5 w-5 text-white" />
        <span className="font-serif text-lg text-white">{restaurantName}</span>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-3 border-b border-white/15 px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/20 shadow-sm">
          <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white truncate max-w-[160px]">{user.name}</p>
          <p className="text-xs text-white/70">
            {ROLE_LABELS[user.role as User['role']] || user.role}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3 lg:px-3 lg:py-4">
        {filteredNav.map((item) => (
          <Link
            key={item.to}
            to={item.to as any}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/15 hover:text-white [&.active]:bg-white [&.active]:text-ember"
            activeOptions={{ exact: item.label === "Overview" }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/15 p-3">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span>Customer Menu</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - mobile: drawer, desktop: fixed */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-30 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/15 bg-sidebar px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-white/70 hover:bg-white/15 hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <span className="text-xs lg:text-sm text-white/70 hidden sm:inline">
            {ROLE_LABELS[user.role as User['role']] || user.role}
          </span>

          <ThemeToggle />

          <button className="flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-white/15 hover:text-white">
            <Bell className="h-4 w-4" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-white/25 px-2 py-1.5 lg:px-3 text-sm font-medium text-white/70 hover:bg-white/15 hover:text-white"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Sign Out</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
