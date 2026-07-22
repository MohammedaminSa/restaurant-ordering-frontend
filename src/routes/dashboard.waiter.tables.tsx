import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getWaiterTables,
  completeSession,
  type WaiterTable,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  Table as TableIcon,
  CheckCircle2,
  Loader2,
  Users,
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/waiter/tables")({
  component: WaiterTables,
});

function WaiterTables() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmCloseTable, setConfirmCloseTable] = useState<WaiterTable | null>(null);

  const tablesQuery = useQuery({
    queryKey: ["waiter-tables", user?.restaurant_id],
    queryFn: () => getWaiterTables(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const closeTableMutation = useMutation({
    mutationFn: (sessionToken: string) => completeSession(sessionToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiter-tables"] });
      queryClient.invalidateQueries({ queryKey: ["waiter-orders"] });
      toast.success("Table closed and session completed");
      setConfirmCloseTable(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to close table"),
  });

  const tables = (tablesQuery.data?.data || []) as WaiterTable[];

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

  const statusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0">Available</Badge>;
      case "occupied":
        return <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-0">Occupied</Badge>;
      case "reserved":
        return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-0">Reserved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">Table {table.table_number}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {table.capacity}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(table.status)}</TableCell>
                  <TableCell>{table.customer_name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {table.started_at ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(table.started_at)}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {table.status === "occupied" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmCloseTable(table)}
                        disabled={closeTableMutation.isPending}
                        className="border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Close Table
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {confirmCloseTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmCloseTable(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-xl text-foreground mb-2">Close Table {confirmCloseTable.table_number}?</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Customer: <span className="font-medium text-foreground">{confirmCloseTable.customer_name || "Guest"}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              This will mark the session as completed and free the table for the next customer.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmCloseTable(null)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => closeTableMutation.mutate(confirmCloseTable.session_token!)}
                disabled={closeTableMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {closeTableMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Closing...</>
                ) : (
                  "Close Table"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
