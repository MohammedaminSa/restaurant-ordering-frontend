import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmt } from "@/lib/cart";
import {
  getPendingPayments,
  getRejectedPayments,
  approvePayment,
  rejectPayment,
  deleteRejectedPayment,
} from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  Clock,
  Banknote,
  Smartphone,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/cashier/checkout")({
  component: CashierCheckout,
});

function CashierCheckout() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"active" | "rejected">("active");

  const pendingQuery = useQuery({
    queryKey: ["cashier-pending-payments", user?.restaurant_id],
    queryFn: () => getPendingPayments(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const rejectedQuery = useQuery({
    queryKey: ["cashier-rejected-payments", user?.restaurant_id],
    queryFn: () => getRejectedPayments(user?.restaurant_id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: (orderId: string) => approvePayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-today-transactions"] });
      toast.success("Payment approved");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to approve payment"),
  });

  const rejectMutation = useMutation({
    mutationFn: (orderId: string) => rejectPayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-rejected-payments"] });
      toast.success("Payment rejected");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to reject payment"),
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => deleteRejectedPayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-rejected-payments"] });
      toast.success("Rejected payment removed");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to delete"),
  });

  const pendingOrders = pendingQuery.data?.data || [];
  const rejectedOrders = rejectedQuery.data?.data || [];

  const paymentIcon = (method: string) => {
    if (method === "cash") return <Banknote className="h-4 w-4" />;
    if (method === "telebirr") return <Smartphone className="h-4 w-4" />;
    return <Building2 className="h-4 w-4" />;
  };

  const paymentLabel = (method: string) => {
    if (method === "cash") return "Cash";
    if (method === "telebirr") return "Digital Wallet";
    return method?.replace(/_/g, " ") || "N/A";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Payment Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and process customer payments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "active"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Payments
          {pendingOrders.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("rejected")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "rejected"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Rejected Payments
          {rejectedOrders.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
              {rejectedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Payments Tab */}
      {tab === "active" && (
        <>
          {pendingQuery.isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
            </div>
          )}

          {pendingQuery.isError && (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="text-sm text-red-600 font-medium">Failed to load payments</p>
                <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!pendingQuery.isLoading && pendingOrders.length === 0 && (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-serif text-xl text-foreground mb-1">No pending payments</p>
              <p className="text-sm text-muted-foreground">
                All payments have been processed
              </p>
            </div>
          )}

          {!pendingQuery.isLoading && pendingOrders.length > 0 && (
            <div className="space-y-3">
              {pendingOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-amber-200 bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-amber-50 p-2.5">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg text-foreground">
                            #{order.order_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Table {order.table_number}
                          </span>
                        </div>
                        {order.customer_name && (
                          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {paymentIcon(order.payment_method)}
                      <span className="capitalize text-muted-foreground">
                        {paymentLabel(order.payment_method)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{item.quantity}x</span>
                        {item.item_name}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-semibold text-foreground">{fmt(parseFloat(order.total_amount))}</span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveMutation.mutate(order.id)}
                        disabled={approveMutation.isPending}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectMutation.mutate(order.id)}
                        disabled={rejectMutation.isPending}
                        size="sm"
                        variant="destructive"
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Rejected Payments Tab */}
      {tab === "rejected" && (
        <>
          {rejectedQuery.isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
            </div>
          )}

          {!rejectedQuery.isLoading && rejectedOrders.length === 0 && (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-serif text-xl text-foreground mb-1">No rejected payments</p>
              <p className="text-sm text-muted-foreground">
                Rejected payments will appear here
              </p>
            </div>
          )}

          {!rejectedQuery.isLoading && rejectedOrders.length > 0 && (
            <div className="space-y-3">
              {rejectedOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-red-200 bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-red-50 p-2.5">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg text-foreground">
                            #{order.order_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Table {order.table_number}
                          </span>
                        </div>
                        {order.customer_name && (
                          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {paymentIcon(order.payment_method)}
                      <span className="capitalize text-muted-foreground">
                        {paymentLabel(order.payment_method)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{item.quantity}x</span>
                        {item.item_name}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-semibold text-foreground">{fmt(parseFloat(order.total_amount))}</span>
                    <Button
                      onClick={() => deleteMutation.mutate(order.id)}
                      disabled={deleteMutation.isPending}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
