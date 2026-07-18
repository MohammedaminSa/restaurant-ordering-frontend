import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/cart";
import {
  TrendingUp,
  Loader2,
  DollarSign,
  CreditCard,
  CalendarDays,
  BarChart3,
  PieChart,
  Download,
  Banknote,
  Smartphone,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayTransactions } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/reports")({
  component: CashierReports,
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

function CashierReports() {
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
  } || {};

  const totalAmount = parseFloat(summary.total_amount || "0");
  const totalCount = summary.transaction_count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales reports and payment summaries
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Sales Summary
            </CardTitle>
            <CardDescription>
              Today's performance overview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-foreground">Failed to load</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-accent/5 p-4 text-center">
                    <p className="text-3xl font-bold">{fmt(totalAmount)}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="rounded-lg bg-accent/5 p-4 text-center">
                    <p className="text-3xl font-bold">{totalCount}</p>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Payment Method Breakdown
                  </p>
                  {Object.entries(summary.by_payment_method || {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(summary.by_payment_method || {}).map(([method, amount]) => {
                        const percentage = ((amount / totalAmount) * 100).toFixed(1);
                        const Icon = methodIcons[method] || CreditCard;
                        return (
                          <div key={method}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="capitalize">{method.replace(/_/g, " ")}</span>
                              </div>
                              <span className="text-muted-foreground">{fmt(amount)} ({percentage}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              {isLoading ? "Loading..." : `${transactions.length} today's records`}
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
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reports data yet</p>
                <p className="text-sm">Transactions will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell>Table {tx.table_number || "N/A"}</TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm truncate block" title={tx.items}>
                          {tx.items || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {tx.payment_method?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(parseFloat(tx.amount || "0"))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {transactions.length > 0 && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{totalCount}</span> transactions totaling{" "}
                  <span className="font-medium text-foreground">{fmt(totalAmount)}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
