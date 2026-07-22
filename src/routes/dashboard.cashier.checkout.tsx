import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmt } from "@/lib/cart";
import {
  DollarSign,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  Receipt,
  AlertCircle,
  Clock,
} from "lucide-react";
import { getActiveSessions, getSessionBill, approvePayment } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/checkout")({
  component: CashierCheckout,
});

function ReceiptPrint({ bill, paymentResult, restaurantName }: { bill: any; paymentResult: any; restaurantName?: string }) {
  return (
    <div className="receipt-print">
      <div className="receipt-content">
        <div className="text-center border-b pb-3 mb-3">
          <p className="font-serif text-xl font-bold">{restaurantName || "Restaurant"}</p>
          <p className="text-xs text-muted-foreground">Payment Receipt</p>
          <p className="text-xs text-muted-foreground">
            {paymentResult?.created_at
              ? new Date(paymentResult.created_at).toLocaleDateString()
              : new Date().toLocaleDateString()}
            {" "}
            {paymentResult?.created_at
              ? new Date(paymentResult.created_at).toLocaleTimeString()
              : new Date().toLocaleTimeString()}
          </p>
        </div>

        <div className="text-sm space-y-1 mb-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span>{bill.session.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Table:</span>
            <span>{bill.session.table_number}</span>
          </div>
        </div>

        <div className="border-t pt-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Items</p>
          {bill.orders?.map((order: any) => (
            <div key={order.id}>
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm py-0.5">
                  <span>{item.quantity}x {item.item_name || item.menu_item_name}</span>
                  <span>{fmt(parseFloat(item.total_price))}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(parseFloat(bill.bill.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{fmt(parseFloat(bill.bill.tax_amount))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span>{fmt(parseFloat(bill.bill.service_charge))}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-1 mt-1">
            <span>Total Paid</span>
            <span>{fmt(parseFloat(paymentResult?.amount || bill.bill.total_amount))}</span>
          </div>
        </div>

        <div className="text-center border-t pt-3 mt-3">
          <p className="text-xs text-muted-foreground capitalize">
            Paid via {paymentResult?.payment_method?.replace(/_/g, " ") || "N/A"}
          </p>
          {paymentResult?.transaction_id && (
            <p className="text-xs text-muted-foreground">
              Ref: {paymentResult.transaction_id}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Thank you!</p>
        </div>
      </div>
    </div>
  );
}

function CashierCheckout() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [step, setStep] = useState<"list" | "review" | "complete">("list");

  const { data: sessionsData, isLoading, isError: isErrorSessions } = useQuery({
    queryKey: ["cashier-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const { data: billData, isLoading: billLoading } = useQuery({
    queryKey: ["cashier-session-bill-approval", selectedSession?.session_token],
    queryFn: () => getSessionBill(selectedSession.session_token),
    enabled: !!selectedSession,
  });

  const approveMutation = useMutation({
    mutationFn: (sessionToken: string) => approvePayment(sessionToken),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["cashier-active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-today-transactions"] });
      setPaymentResult(response.data);
      setStep("complete");
      toast.success("Payment approved successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to approve payment");
    },
  });

  const sessions = (sessionsData?.data || []) as any[];

  // Sessions that have unpaid non-cash orders needing approval
  const pendingSessions = sessions.filter((s: any) => {
    return parseFloat(s.total_bill || "0") > parseFloat(s.paid_amount || "0");
  });

  const handleSelectSession = async (session: any) => {
    setSelectedSession(session);
    try {
      const response = await getSessionBill(session.session_token);
      if (response.success) {
        setBill(response.data);
        setStep("review");
      }
    } catch (error) {
      toast.error("Failed to load bill");
    }
  };

  const handleApprove = () => {
    if (!selectedSession) return;
    approveMutation.mutate(selectedSession.session_token);
  };

  const handleNewApproval = () => {
    setStep("list");
    setSelectedSession(null);
    setBill(null);
    setPaymentResult(null);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Get the pending non-cash orders (submitted by customer)
  const pendingOrders = bill?.orders?.filter(
    (o: any) => o.payment_method && o.payment_method !== 'cash' && o.payment_status === 'unpaid'
  ) || [];

  if (step === "complete" && paymentResult) {
    return (
      <>
        <div className="space-y-6 no-print">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Payment Approved</h1>
            <p className="mt-1 text-sm text-muted-foreground">Payment has been successfully approved</p>
          </div>

          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              <div className="max-w-sm mx-auto">
                <p className="text-3xl font-bold">{fmt(parseFloat(paymentResult.amount || "0"))}</p>
                <p className="text-sm text-muted-foreground capitalize mt-1">
                  {paymentResult.payment_method?.replace(/_/g, " ")}
                </p>
                {paymentResult.transaction_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ref: {paymentResult.transaction_id}
                  </p>
                )}
              </div>

              {paymentResult.created_at && (
                <p className="text-sm text-muted-foreground">
                  {new Date(paymentResult.created_at).toLocaleString()}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Session remains active. Waiter will close the table when the customer leaves.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button onClick={handleNewApproval}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  New Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="print-only">
          {bill && (
            <ReceiptPrint
              bill={bill}
              paymentResult={paymentResult}
              restaurantName={bill.session.restaurant_name}
            />
          )}
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-only, .print-only * { visibility: visible; }
            .print-only { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
            .no-print { display: none !important; }
          }
          @media screen {
            .print-only { display: none; }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Payment Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve customer-submitted payments
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {step === "list" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>
                  Sessions with non-cash payments awaiting verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isErrorSessions ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <p className="text-lg font-medium text-foreground">Failed to load</p>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : pendingSessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending approvals</p>
                    <p className="text-sm">All payments have been processed</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSessions.map((session: any) => (
                      <div
                        key={session.session_token}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors"
                        onClick={() => handleSelectSession(session)}
                      >
                        <div>
                          <p className="font-medium">Table {session.table_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.customer_name || "Guest"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{fmt(parseFloat(session.total_bill || "0"))}</p>
                          <p className="text-xs text-amber-600 flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" />
                            Awaiting approval
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "review" && bill && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Review Payment
                </CardTitle>
                <CardDescription>
                  Table {bill.session.table_number} — {bill.session.customer_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No pending non-cash payments for this session.</p>
                  </div>
                ) : (
                  <>
                    {/* Customer's submitted payment details */}
                    {pendingOrders.map((order: any) => (
                      <div key={order.id} className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <h3 className="font-semibold text-amber-800 text-sm">
                            Customer Submitted Payment
                          </h3>
                        </div>
                        <div className="border-t border-amber-200 pt-3 space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-y-1.5">
                            <span className="text-amber-600">Order #</span>
                            <span className="font-semibold text-amber-900 text-right">#{order.order_number}</span>

                            <span className="text-amber-600">Payment Method</span>
                            <span className="font-semibold text-amber-900 text-right capitalize">
                              {order.payment_method === 'telebirr' ? 'Digital Wallet' : order.payment_method?.replace(/_/g, ' ')}
                            </span>

                            {order.payment_account && (
                              <>
                                {order.payment_method === 'telebirr' ? (
                                  <>
                                    <span className="text-amber-600">Wallet</span>
                                    <span className="font-semibold text-amber-900 text-right">{order.payment_account.type}</span>
                                    <span className="text-amber-600">Phone</span>
                                    <span className="font-mono font-bold text-amber-900 text-right">{order.payment_account.phone}</span>
                                    <span className="text-amber-600">Account Name</span>
                                    <span className="text-amber-900 text-right">{order.payment_account.account_name}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-amber-600">Bank</span>
                                    <span className="font-semibold text-amber-900 text-right">{order.payment_account.bank_name}</span>
                                    <span className="text-amber-600">Account Holder</span>
                                    <span className="text-amber-900 text-right">{order.payment_account.account_holder}</span>
                                    <span className="text-amber-600">Account Number</span>
                                    <span className="font-mono font-bold text-amber-900 text-right">{order.payment_account.account_number}</span>
                                  </>
                                )}
                              </>
                            )}

                            {order.transaction_id && (
                              <>
                                <span className="text-amber-600">Transaction ID</span>
                                <span className="font-mono font-bold text-amber-900 text-right">{order.transaction_id}</span>
                              </>
                            )}

                            <span className="text-amber-600">Amount</span>
                            <span className="font-bold text-amber-900 text-right">{fmt(parseFloat(order.total_amount))}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Bill summary */}
                    <div className="rounded-lg bg-accent/5 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{fmt(parseFloat(bill.bill.subtotal))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{fmt(parseFloat(bill.bill.tax_amount))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Charge</span>
                        <span>{fmt(parseFloat(bill.bill.service_charge))}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Total</span>
                        <span>{fmt(parseFloat(bill.bill.total_amount))}</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("list")} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending || pendingOrders.length === 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve Payment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice
              </CardTitle>
              <CardDescription>
                {selectedSession ? "Order summary" : "No session selected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSession ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a session</p>
                  <p className="text-sm">to review payment</p>
                </div>
              ) : billLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : bill ? (
                <div className="space-y-4">
                  <div className="text-center border-b pb-3">
                    <p className="font-serif text-xl">INVOICE</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Customer:</span> {bill.session.customer_name}</p>
                    <p><span className="text-muted-foreground">Table:</span> {bill.session.table_number}</p>
                  </div>
                  <div className="border-t pt-3 space-y-1">
                    {bill.orders?.map((order: any) => (
                      <div key={order.id}>
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm py-0.5">
                            <span>{item.quantity}x {item.item_name || item.menu_item_name}</span>
                            <span>{fmt(parseFloat(item.total_price))}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmt(parseFloat(bill.bill.subtotal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{fmt(parseFloat(bill.bill.tax_amount))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service</span>
                      <span>{fmt(parseFloat(bill.bill.service_charge))}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1 mt-1">
                      <span>Total</span>
                      <span>{fmt(parseFloat(bill.bill.total_amount))}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
