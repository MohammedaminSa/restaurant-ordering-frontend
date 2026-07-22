import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/cart";
import {
  DollarSign,
  Clock,
  CreditCard,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Smartphone,
  History,
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

  const pendingSessions = sessions.filter((s: any) => {
    return parseFloat(s.total_bill || "0") > parseFloat(s.paid_amount || "0");
  });

  const totalPending = pendingSessions.reduce((sum: number, s: any) => {
    return sum + (parseFloat(s.total_bill || "0") - parseFloat(s.paid_amount || "0"));
  }, 0);

  const totalRevenue = parseFloat(summary?.total_amount || "0");
  const transactionCount = summary?.transaction_count || 0;

  const methodIcons: Record<string, typeof CreditCard> = {
    cash: Banknote,
    card: CreditCard,
    digital_wallet: Smartphone,
    telebirr: Smartphone,
    bank_transfer: Banknote,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Cashier Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today's payment overview and activity summary
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isErrorSessions ? "—" : isLoadingSessions ? "..." : pendingSessions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {isErrorSessions ? "Unavailable" : isLoadingSessions ? "Loading..." : `${fmt(totalPending)} pending`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {isErrorTransactions ? "—" : isLoadingTransactions ? "..." : transactionCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {isErrorTransactions ? "Unavailable" : isLoadingTransactions ? "Loading..." : "Completed transactions"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isErrorTransactions ? "—" : isLoadingTransactions ? "..." : fmt(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isErrorTransactions ? "Unavailable" : isLoadingTransactions ? "Loading..." : `From ${transactionCount} transactions`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
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
              <History className="h-5 w-5" />
              Today's Transactions
            </CardTitle>
            <CardDescription>
              Most recent payment records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isErrorTransactions ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-foreground">Failed to load</p>
              </div>
            ) : isLoadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions today</p>
                <p className="text-sm">Payments will appear here once processed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 10).map((tx: any) => {
                  const Icon = methodIcons[tx.payment_method] || CreditCard;
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Table {tx.table_number || "N/A"} — {tx.customer_name || "Guest"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleTimeString()}
                            {" "}
                            <span className="capitalize">({tx.payment_method?.replace(/_/g, " ")})</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{fmt(parseFloat(tx.amount || "0"))}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method Breakdown
            </CardTitle>
            <CardDescription>
              Today's revenue by payment type
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-4">
                {Object.entries(summary.by_payment_method || {}).map(([method, amount]) => {
                  const total = Object.values(summary.by_payment_method || {}).reduce((a, b) => a + b, 0);
                  const percentage = (amount / total) * 100;
                  const Icon = methodIcons[method] || CreditCard;
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{method.replace(/_/g, " ")}</span>
                        </div>
                        <span className="text-sm font-medium">{fmt(amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
