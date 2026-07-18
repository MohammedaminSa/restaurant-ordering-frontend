import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/cart";
import {
  DollarSign,
  Clock,
  Users,
  CreditCard,
  TrendingUp,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { getActiveSessions, getTodayTransactions } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/")({
  component: CashierOverview,
});

function CashierOverview() {
  const user = useAuthStore((s) => s.user);

  const { data: sessionsData, isLoading: isLoadingSessions, isError: isErrorSessions } = useQuery({
    queryKey: ["cashier-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const { data: transactionsData, isLoading: isLoadingTransactions, isError: isErrorTransactions } = useQuery({
    queryKey: ["cashier-today-transactions", user?.restaurant_id],
    queryFn: () => getTodayTransactions(user?.restaurant_id),
    enabled: !!user,
  });

  const sessions = (sessionsData?.data || []) as any[];
  const transactions = (transactionsData?.data?.transactions || []) as any[];
  const summary = (transactionsData?.data?.summary) as {
    total_amount?: string;
    transaction_count?: number;
    by_payment_method?: Record<string, number>;
  } || {};

  const activeSessionsCount = sessions.length;
  const totalRevenue = parseFloat(summary?.total_amount || "0");
  const transactionCount = summary?.transaction_count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Cashier Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor active sessions, revenue, and recent transactions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isErrorSessions ? "—" : isLoadingSessions ? "..." : activeSessionsCount}</div>
            <p className="text-xs text-muted-foreground">
              {isErrorSessions ? "Unavailable" : isLoadingSessions ? "Loading..." : activeSessionsCount > 0 ? "Sessions in progress" : "No active sessions"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total from {transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(summary.by_payment_method || {}).reduce((a, b) => a + b, 0) || 0}
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(summary.by_payment_method || {}).slice(0, 3).map(([method, amount]) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method.replace(/_/g, " ")}: {fmt(amount)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactionCount > 0 ? fmt(totalRevenue / transactionCount) : fmt(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Orders
            </CardTitle>
            <CardDescription>
              Currently active dining sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isErrorSessions ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
                </div>
              ) : isLoadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active orders</p>
                  <p className="text-sm">All tables are currently free</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.session_token} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-accent/10 p-2">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{session.customer_name || "Guest"}</p>
                        <p className="text-sm text-muted-foreground">Table: {session.table_number || "N/A"}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Payment Summary
            </CardTitle>
            <CardDescription>
              Today's payment breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isErrorTransactions ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
                </div>
              ) : Object.entries(summary.by_payment_method || {}).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payments recorded today</p>
                </div>
              ) : (
                Object.entries(summary.by_payment_method || {}).map(([method, amount]) => {
                  const total = Object.values(summary.by_payment_method || {}).reduce((a, b) => a + b, 0);
                  const percentage = (amount / total) * 100;
                  return (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm capitalize">{method.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
                          <div className="h-full bg-accent transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-sm font-medium w-20 text-right">{fmt(amount)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
