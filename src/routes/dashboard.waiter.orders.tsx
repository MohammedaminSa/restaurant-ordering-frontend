import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getWaiterTables,
  getWaiterOrders,
  getMenuItems,
  getCategories,
  serveOrder,
  createWaiterOrder,
  type WaiterTable,
  type MenuItem,
  type Category,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { fmt } from "@/lib/cart";
import {
  ClipboardList,
  Utensils,
  CheckCircle2,
  Loader2,
  Plus,
  Minus,
  X,
  Search,
  RefreshCw,
  Bell,
  ShoppingCart,
  Send,
  Users,
  Table as TableIcon,
  User,
  AlertCircle,
  Smartphone,
  Building2,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/waiter/orders")({
  component: WaiterOrders,
});

function WaiterOrders() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<{ menu_item_id: string; name: string; price: number; quantity: number }[]>([]);
  const [selectedTable, setSelectedTable] = useState<WaiterTable | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [orderNotes, setOrderNotes] = useState("");
  const [menuSearch, setMenuSearch] = useState("");

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

  const menuItemsQuery = useQuery({
    queryKey: ["menu-items", user?.restaurant_id],
    queryFn: () => getMenuItems({ restaurantId: user?.restaurant_id, isAvailable: true }),
    enabled: !!user && showCreateModal,
  });

  const categoriesQuery = useQuery({
    queryKey: ["menu-categories", user?.restaurant_id],
    queryFn: () => getCategories(user?.restaurant_id),
    enabled: !!user && showCreateModal,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: Parameters<typeof createWaiterOrder>[0]) =>
      createWaiterOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiter-orders"] });
      queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
      toast.success("Order placed — pending payment verification");
      handleCloseModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create order"),
  });

  const serveMutation = useMutation({
    mutationFn: (orderId: string) => serveOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiter-orders"] });
      toast.success("Order marked as served");
    },
    onError: (err: any) => toast.error(err.message || "Failed to serve order"),
  });

  const tables = (tablesQuery.data?.data || []) as WaiterTable[];
  const orders = (ordersQuery.data?.data || []) as any[];
  const categories = (categoriesQuery.data?.data || []) as Category[];
  const menuItems = (menuItemsQuery.data?.data || []) as MenuItem[];

  const readyOrders = orders
    .filter((o) => o.status === "ready")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const availableTables = tables.filter((t) => t.status !== 'maintenance');

  const getTableForOrder = (order: any) => tables.find((t) => t.session_token === order.session_token);

  const filteredCategories = categories.filter((c) => c.is_active !== false);
  const filteredMenuItems = menuItems
    .filter((item) => !selectedCategory || item.category_id === selectedCategory)
    .filter((item) => !menuSearch || item.name.toLowerCase().includes(menuSearch.toLowerCase()));

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) return prev.map((c) => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: parseFloat(item.base_price), quantity: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.menu_item_id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getTimeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const handleCreateOrder = () => {
    if (!selectedTable) return toast.error("Please select a table");
    if (cart.length === 0) return toast.error("Please add at least one item");
    if (!selectedTable.session_token && !customerName.trim()) {
      return toast.error("Please enter the customer's name");
    }

    createOrderMutation.mutate({
      ...(selectedTable.session_token
        ? { session_token: selectedTable.session_token }
        : { table_id: selectedTable.id, customer_name: customerName.trim(), customer_phone: customerPhone.trim() || undefined }),
      items: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
      special_instructions: orderNotes || undefined,
      payment_method: selectedPaymentMethod as any,
      transaction_id: selectedPaymentMethod !== 'cash' ? transactionId.trim() : undefined,
    });
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCart([]);
    setSelectedTable(null);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedPaymentMethod('cash');
    setTransactionId('');
    setOrderNotes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Ready Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {readyOrders.length} order{readyOrders.length !== 1 ? "s" : ""} ready to serve
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ["waiter-orders"] }); queryClient.invalidateQueries({ queryKey: ["waiter-tables"] }); }}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />New Order
          </Button>
        </div>
      </div>

      {ordersQuery.isLoading && (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
      )}

      {ordersQuery.isError && (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-red-600 font-medium">Failed to load orders</p>
            <Button variant="outline" size="sm" onClick={() => ordersQuery.refetch()}>Try Again</Button>
          </div>
        </div>
      )}

      {!ordersQuery.isLoading && readyOrders.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-serif text-xl text-foreground mb-1">No ready orders</p>
          <p className="text-sm text-muted-foreground mb-4">Orders from the kitchen will appear here</p>
          <Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-1" />New Order</Button>
        </div>
      )}

      {!ordersQuery.isLoading && readyOrders.length > 0 && (
        <div className="space-y-3">
          {readyOrders.map((order: any) => {
            const table = getTableForOrder(order);
            return (
              <Card key={order.id} className="ring-2 ring-emerald-400 transition-all hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                        <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg text-foreground">#{order.order_number}</span>
                          {table && <Badge variant="secondary" className="text-xs">Table {table.table_number}</Badge>}
                          {table?.customer_name && <span className="text-xs text-muted-foreground">{table.customer_name}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Ready · {getTimeAgo(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">{fmt(parseFloat(order.total_amount))}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.items?.map((item: any) => (
                      <span key={item.id} className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-sm">
                        <span className="font-medium text-foreground">{item.quantity}x</span>
                        {item.menu_item_name || item.item_name}
                      </span>
                    ))}
                  </div>
                  {order.special_instructions && (
                    <p className="mt-2 text-xs text-muted-foreground italic">Note: {order.special_instructions}</p>
                  )}
                  <Button
                    onClick={() => serveMutation.mutate(order.id)}
                    disabled={serveMutation.isPending}
                    className="mt-3"
                    size="sm"
                  >
                    {serveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Mark as Served
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleCloseModal}>
          <div className="w-full max-w-3xl max-h-[90vh] rounded-xl border border-border bg-card shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-foreground">New Order</h2>
                  <p className="text-xs text-muted-foreground">{cart.length} items · {fmt(cartTotal)}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Select Table</label>
                {availableTables.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No tables available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableTables.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTable(t);
                          setCustomerName(t.customer_name || "");
                        }}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${
                          selectedTable?.id === t.id
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border hover:border-accent/50 bg-background"
                        } ${t.session_token ? "" : "border-dashed"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <TableIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground text-sm">Table {t.table_number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {t.customer_name || (t.session_token ? "Guest" : "No session")}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedTable && !selectedTable.session_token && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-blue-800">New Customer</p>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              )}

              {selectedTable && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-foreground">Payment Method</label>
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={(v) => {
                      setSelectedPaymentMethod(v);
                      if (v === 'cash') setTransactionId('');
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <div className="flex items-center gap-2">
                        {selectedPaymentMethod === 'cash' ? <Banknote className="h-4 w-4" /> : selectedPaymentMethod === 'telebirr' ? <Smartphone className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        <SelectValue placeholder="Select payment method" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          <span>Cash — Pay at counter</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="telebirr">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span>Digital Wallet</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>Bank Transfer</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedPaymentMethod !== 'cash' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Transaction ID / Reference *</label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Enter reference number"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Menu Items</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search items..." className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  <button onClick={() => setSelectedCategory(null)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>All</button>
                  {filteredCategories.map((cat) => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>{cat.name}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {filteredMenuItems.map((item) => {
                    const inCart = cart.find((c) => c.menu_item_id === item.id);
                    return (
                      <button key={item.id} onClick={() => addToCart(item)} className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${inCart ? "border-accent bg-accent/5" : "border-border bg-background hover:border-accent/50"}`}>
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmt(parseFloat(item.base_price))}</p>
                        {inCart && <span className="text-xs text-accent font-medium mt-1 block">{inCart.quantity} in cart</span>}
                      </button>
                    );
                  })}
                </div>
                {filteredMenuItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{menuSearch ? "No matches" : "No items available"}</p>}
              </div>

              {cart.length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Cart ({cart.length})
                  </h3>
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.menu_item_id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{fmt(item.price * item.quantity)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.menu_item_id, -1)} className="rounded-full p-1 text-muted-foreground hover:bg-accent"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.menu_item_id, 1)} className="rounded-full p-1 text-muted-foreground hover:bg-accent"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border mt-3 pt-3">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="text-sm font-bold">{fmt(cartTotal)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes for Kitchen</label>
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions..." rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>

            <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending || cart.length === 0 || !selectedTable || (!selectedTable.session_token && !customerName.trim()) || (selectedPaymentMethod !== 'cash' && !transactionId.trim())}
              >
                {createOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Place Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
