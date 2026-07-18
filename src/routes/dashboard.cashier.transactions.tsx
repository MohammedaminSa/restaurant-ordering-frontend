import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/cart";
import {
  History,
  Loader2,
  DollarSign,
  TrendingUp,
  CalendarDays,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { getTodayTransactions } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/transactions")({
  component: CashierTransactions,
});

const methodIcons: Record<string, typeof CreditCard> = {
  cash: Banknote,
  card: CreditCard,
  digital_wallet: Smartphone,
  telebirr: Smartphone,
  chapa: Wallet,
  bank_transfer: Banknote,
};

function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function CashierTransactions() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cashier-today-transactions", user?.restaurant_id],
    queryFn: () => getTodayTransactions(user?.restaurant_id),
    enabled: !!user,
  });

  const transactions = (data?.data?.transactions || []) as any[];
  const summary = (data?.data?.summary) as {
    total_amount?: string;
    transaction_count?: number;
    by_payment_method?: Record<string, number>;
    total_tip_amount?: string;
  } || {};

  const totalAmount = parseFloat(summary.total_amount || "0");
  const totalCount = summary.transaction_count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payment history and completed transactions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">{totalCount} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? fmt(totalAmount / totalCount) : fmt(0)}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(summary.by_payment_method || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">Methods used today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Today's Transactions
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `${transactions.length} transactions`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions yet today</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => {
                      const Icon = methodIcons[tx.payment_method] || CreditCard;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDateTime(tx.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {tx.customer_name || "Guest"}
                          </TableCell>
                          <TableCell>Table {tx.table_number || "N/A"}</TableCell>
                          <TableCell className="max-w-xs">
                            <span className="text-sm truncate block" title={tx.items}>
                              {tx.items || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm capitalize">
                                {tx.payment_method?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {fmt(parseFloat(tx.amount || "0"))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              Completed
                            </Badge>
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
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
              <CardDescription>
                Breakdown by payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(summary.by_payment_method || {}).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payments today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(summary.by_payment_method || {}).map(([method, amount]) => {
                    const Icon = methodIcons[method] || CreditCard;
                    return (
                      <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-accent/10 p-2">
                            <Icon className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {method.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">Total collected</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">{fmt(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
