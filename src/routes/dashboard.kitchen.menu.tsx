import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMenuItems, getCategories, toggleMenuItemAvailability, type MenuItem } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { fmt } from "@/lib/cart";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Utensils,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/kitchen/menu")({
  component: KitchenMenu,
});

function KitchenMenu() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterAvailability, setFilterAvailability] = useState<string>("all");

  const menuQuery = useQuery({
    queryKey: ["menu-items", user?.restaurant_id],
    queryFn: () => getMenuItems({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["menu-categories", user?.restaurant_id],
    queryFn: () => getCategories(user?.restaurant_id),
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: (itemId: string) => toggleMenuItemAvailability(itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success(data.data?.is_available ? "Item is now available" : "Item is now unavailable");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update item availability"),
  });

  const items = (menuQuery.data?.data || []) as MenuItem[];
  const categories = (categoriesQuery.data?.data || []) as any[];

  const filtered = items
    .filter((item) => !selectedCategory || item.category_id === selectedCategory)
    .filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()))
    .filter((item) => filterAvailability === "all" ||
      (filterAvailability === "available" && item.is_available) ||
      (filterAvailability === "unavailable" && !item.is_available)
    );

  const isError = menuQuery.isError || categoriesQuery.isError;
  const isLoading = menuQuery.isLoading;

  if (isError) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600 font-medium">Failed to load menu</p>
          <Button variant="outline" size="sm" onClick={() => { menuQuery.refetch(); categoriesQuery.refetch(); }}>
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
          <h1 className="font-serif text-3xl text-foreground">Menu Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.filter((i) => i.is_available).length} available · {items.filter((i) => !i.is_available).length} unavailable
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["menu-items"] })}>
          <RefreshCw className="h-4 w-4 mr-1" />Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items..." className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "available", "unavailable"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterAvailability(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filterAvailability === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        <button onClick={() => setSelectedCategory(null)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>All</button>
        {categories.map((cat: any) => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>{cat.name}</button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Utensils className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-serif text-xl text-foreground mb-1">{search ? "No items match" : "No menu items"}</p>
          <p className="text-sm text-muted-foreground">{search ? "Try a different search term" : "No items in this category"}</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
                const cat = categories.find((c: any) => c.id === item.category_id);
                return (
                  <tr key={item.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-1.5 ${item.is_available ? "bg-emerald-50" : "bg-red-50"}`}>
                          {item.is_available
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cat?.name || "Uncategorized"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{fmt(parseFloat(item.base_price))}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={item.is_available
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      }>
                        {item.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => toggleMutation.mutate(item.id)}
                        disabled={toggleMutation.isPending}
                        variant={item.is_available ? "outline" : "default"}
                        size="sm"
                        className={!item.is_available ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                      >
                        {toggleMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        {item.is_available ? "Mark Unavailable" : "Mark Available"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
