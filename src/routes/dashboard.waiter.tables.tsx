import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getWaiterTables,
  getWaiterOrders,
  createSession,
  completeSession,
  type WaiterTable,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  Table as TableIcon,
  CheckCircle2,
  Loader2,
  Users,
  MapPin,
  UserPlus,
  LogOut,
  Clock,
  Utensils,
  ClipboardList,
  X,
  Search,
  RefreshCw,
  Phone,
  User,
  Circle,
  ChevronRight,
  Plus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/waiter/tables")({
  component: WaiterTables,
});

const tableStyle = {
  available: { label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
  occupied: { label: "Occupied", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", icon: Users },
  reserved: { label: "Reserved", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", icon: Clock },
};

function WaiterTables() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selectedTable, setSelectedTable] = useState<WaiterTable | null>(null);
  const [showOccupyForm, setShowOccupyForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [search, setSearch] = useState("");

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

  const occupyMutation = useMutation({
    mutationFn: (data: { table_id: string; customer_name: string; customer_phone?: string }) =>
      createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
      toast.success("Table occupied successfully");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to occupy table"),
  });

  const clearMutation = useMutation({
    mutationFn: (token: string) => completeSession(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
      queryClient.invalidateQueries({ queryKey: ["waiter-orders"] });
      toast.success("Table cleared");
      setSelectedTable(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to clear table"),
  });

  const tables = (tablesQuery.data?.data || []) as WaiterTable[];
  const orders = (ordersQuery.data?.data || []) as any[];

  const activeOrders = orders.filter(
    (o: any) => o.status === "pending" || o.status === "preparing" || o.status === "ready"
  );

  const searched = search
    ? tables.filter(
        (t) =>
          t.table_number.toLowerCase().includes(search.toLowerCase()) ||
          t.customer_name?.toLowerCase().includes(search.toLowerCase())
      )
    : tables;

  const displayed = filter === "all" ? searched : searched.filter((t) => t.status === filter);

  const stats = [
    { label: "Total", count: tables.length, color: "text-foreground" },
    { label: "Occupied", count: tables.filter((t) => t.status === "occupied").length, color: "text-amber-600" },
    { label: "Available", count: tables.filter((t) => t.status === "available").length, color: "text-emerald-600" },
  ];

  const getTimeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const resetForm = () => {
    setShowOccupyForm(false);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTable(null);
  };

  const tableOrders = selectedTable
    ? activeOrders.filter((o: any) => o.session_token === selectedTable.session_token)
    : [];

  const hasReady = tableOrders.some((o: any) => o.status === "ready");
  const isLoading = tablesQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Tables</h1>
          <div className="flex items-center gap-3 mt-1">
            {stats.map((s) => (
              <span key={s.label} className="text-sm">
                <span className={`font-medium ${s.color}`}>{s.count}</span>
                <span className="text-muted-foreground ml-1">{s.label}</span>
              </span>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
          queryClient.invalidateQueries({ queryKey: ["waiter-orders"] });
        }}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables or customers..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          {["all", "available", "occupied", "reserved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
      )}

      {tablesQuery.isError && (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-red-600 font-medium">Failed to load tables</p>
            <Button variant="outline" size="sm" onClick={() => tablesQuery.refetch()}>Try Again</Button>
          </div>
        </div>
      )}

      {!isLoading && displayed.length === 0 && (
        <div className="border border-border bg-card rounded-xl py-16 text-center">
          <TableIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-serif text-xl text-foreground mb-1">{search ? "No matches" : "No tables"}</p>
          <p className="text-sm text-muted-foreground">{search ? "Try a different term" : "No tables configured yet"}</p>
        </div>
      )}

      {!isLoading && displayed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayed.map((table) => {
            const s = tableStyle[table.status as keyof typeof tableStyle] || tableStyle.available;
            const tOrders = activeOrders.filter((o: any) => o.session_token === table.session_token);
            const ready = tOrders.some((o: any) => o.status === "ready");
            return (
              <button
                key={table.id}
                onClick={() => { setSelectedTable(table); setShowOccupyForm(false); }}
                className={`relative rounded-xl border-2 bg-card p-4 text-left transition-all hover:shadow-md ${s.border} ${selectedTable?.id === table.id ? "ring-2 ring-accent" : ""} ${ready ? "ring-2 ring-emerald-400" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${s.dot.replace("bg-", "text-")}`}>
                      {s.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{table.location}</span>
                </div>
                <p className="font-serif text-3xl text-foreground">{table.table_number}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {table.capacity}
                </div>
                {table.customer_name && (
                  <p className="mt-2 text-xs font-medium text-foreground truncate">{table.customer_name}</p>
                )}
                {table.started_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {getTimeAgo(table.started_at)}
                  </p>
                )}
                {tOrders.length > 0 && (
                  <div className={`mt-2 rounded-md px-2 py-1 text-xs ${ready ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {tOrders.length} order{tOrders.length > 1 ? "s" : ""}{ready ? " — Ready!" : ""}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedTable && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={resetForm} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${tableStyle[selectedTable.status as keyof typeof tableStyle]?.badge.split(" ")[0] || "bg-muted"}`}>
                  <TableIcon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-foreground">Table {selectedTable.table_number}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`font-medium capitalize ${tableStyle[selectedTable.status as keyof typeof tableStyle]?.dot.replace("bg-", "text-") || "text-muted-foreground"}`}>
                      {selectedTable.status}
                    </span>
                    <span>·</span>
                    <span>{selectedTable.capacity} seats</span>
                    {selectedTable.location && <><span>·</span><span>{selectedTable.location}</span></>}
                  </div>
                </div>
              </div>
              <button onClick={resetForm} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedTable.status === "available" && !showOccupyForm && (
                <div className="p-6">
                  <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-4">
                      <UserPlus className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="font-serif text-lg text-foreground mb-1">Start a Session</h3>
                    <p className="text-sm text-muted-foreground mb-6">Occupy this table with a new customer</p>
                    <Button onClick={() => setShowOccupyForm(true)} size="lg" className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Start New Session
                    </Button>
                  </div>
                </div>
              )}

              {showOccupyForm && (
                <form onSubmit={(e) => { e.preventDefault(); if (!customerName.trim()) { toast.error("Customer name is required"); return; } occupyMutation.mutate({ table_id: selectedTable.id, customer_name: customerName.trim(), customer_phone: customerPhone.trim() || undefined }); }} className="p-6 space-y-5">
                  <h3 className="font-serif text-lg text-foreground">New Customer Session</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Customer Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. John Doe" required className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Phone (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. +1 555-0123" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setShowOccupyForm(false); setCustomerName(""); setCustomerPhone(""); }} className="flex-1">Cancel</Button>
                    <Button type="submit" disabled={occupyMutation.isPending || !customerName.trim()} className="flex-1">
                      {occupyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                      Occupy
                    </Button>
                  </div>
                </form>
              )}

              {selectedTable.status === "occupied" && (
                <div className="p-6 space-y-5">
                  {selectedTable.customer_name && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2.5">
                          <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Customer</p>
                          <p className="font-semibold text-foreground">{selectedTable.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getTimeAgo(selectedTable.started_at || "")}</span>
                        {selectedTable.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedTable.customer_phone}</span>}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-accent" />
                      Orders
                    </h4>
                    {tableOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-xl">No orders yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tableOrders.map((o: any) => (
                          <div key={o.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">#{o.order_number}</span>
                              <Badge variant="outline" className={`text-[10px] capitalize ${
                                o.status === "ready" ? "border-emerald-200 text-emerald-600 bg-emerald-50" :
                                o.status === "preparing" ? "border-orange-200 text-orange-600 bg-orange-50" :
                                "border-amber-200 text-amber-600 bg-amber-50"
                              }`}>{o.status}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {o.items?.map((item: any) => (
                                <span key={item.id} className="text-xs text-muted-foreground">{item.quantity}x {item.menu_item_name || item.item_name}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/dashboard/waiter/orders">
                        <Plus className="h-4 w-4 mr-2" />
                        New Order
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Link>
                    </Button>
                    <Button
                      onClick={() => { if (selectedTable.session_token) clearMutation.mutate(selectedTable.session_token); }}
                      disabled={clearMutation.isPending}
                      variant="outline"
                      className="w-full border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogOut className="h-4 w-4 mr-1" />}
                      End Session
                    </Button>
                  </div>
                </div>
              )}

              {selectedTable.status === "reserved" && (
                <div className="p-6">
                  <div className="rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 p-10 text-center">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-blue-500" />
                    <h3 className="font-serif text-lg text-foreground mb-1">Reserved</h3>
                    <p className="text-sm text-muted-foreground">This table is reserved</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
