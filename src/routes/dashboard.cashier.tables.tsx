import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/cart";
import {
  Table as TableIcon,
  Loader2,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { getActiveSessions, getWaiterTables, type WaiterTable } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/tables")({
  component: CashierTables,
});

function CashierTables() {
  const user = useAuthStore((s) => s.user);

  const { data: tablesData, isLoading: tablesLoading, isError: isErrorTables } = useQuery({
    queryKey: ["cashier-tables", user?.restaurant_id],
    queryFn: () => getWaiterTables(user?.restaurant_id),
    enabled: !!user,
  });

  const { data: sessionsData, isLoading: sessionsLoading, isError: isErrorSessions } = useQuery({
    queryKey: ["cashier-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const tables = (tablesData?.data || []) as WaiterTable[];
  const sessions = (sessionsData?.data || []) as any[];

  const getSessionDuration = (startedAt: string): string => {
    const minutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const activeCount = tables.filter((t) => t.status === "occupied").length;
  const availableCount = tables.filter((t) => t.status === "available").length;
  const reservedCount = tables.filter((t) => t.status === "reserved").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Tables</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor table statuses and manage customer sessions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <TableIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{availableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reservedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Table Status
              </CardTitle>
              <CardDescription>
                {tablesLoading ? "Loading..." : `${tables.length} tables configured`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isErrorTables ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
                </div>
              ) : tablesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TableIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tables configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => {
                      const session = table.status === "occupied"
                        ? sessions.find((s: any) => s.table_number === table.table_number)
                        : null;

                      return (
                        <TableRow key={table.id}>
                          <TableCell className="font-medium">Table {table.table_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {table.capacity}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {table.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              table.status === "available"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : table.status === "occupied"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                            }`}>
                              {table.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {session ? session.customer_name || "Guest" : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {session ? getSessionDuration(session.started_at) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                {sessionsLoading ? "Loading..." : `${sessions.length} active sessions`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isErrorSessions ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
                </div>
              ) : sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.session_token} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Table {session.table_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.customer_name || "Guest"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getSessionDuration(session.started_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
