import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmt } from "@/lib/cart";
import {
  DollarSign,
  CreditCard,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  Receipt,
  Banknote,
  Smartphone,
  Wallet,
  Landmark,
  AlertCircle,
} from "lucide-react";
import { getActiveSessions, getSessionBill, recordPayment, getMyRestaurant, type SessionBill, type PaymentRequest, type PaymentDetails } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/checkout")({
  component: CashierCheckout,
});

interface PaymentForm {
  session_token: string;
  amount: number;
  payment_method: "cash" | "card" | "digital_wallet" | "telebirr" | "bank_transfer";
  tip_amount: number;
  notes: string;
}

function ReceiptPrint({ bill, paymentResult, restaurantName }: { bill: SessionBill; paymentResult: any; restaurantName?: string }) {
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
          {paymentResult?.tip_amount && parseFloat(paymentResult.tip_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tip</span>
              <span>{fmt(parseFloat(paymentResult.tip_amount))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1 mt-1">
            <span>Total Paid</span>
            <span>{fmt(parseFloat(paymentResult?.amount || bill.bill.total_amount))}</span>
          </div>
        </div>

        <div className="text-center border-t pt-3 mt-3">
          <p className="text-xs text-muted-foreground capitalize">
            Paid via {paymentResult?.payment_method?.replace(/_/g, " ") || "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Thank you!</p>
        </div>
      </div>
    </div>
  );
}

function CashierCheckout() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"select" | "payment" | "complete">("select");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [form, setForm] = useState<PaymentForm>({
    session_token: "",
    amount: 0,
    payment_method: "cash",
    tip_amount: 0,
    notes: "",
  });
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const { data: sessionsData, isLoading, isError: isErrorSessions } = useQuery({
    queryKey: ["cashier-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const { data: billData, isLoading: billLoading, isError: isErrorBill } = useQuery({
    queryKey: ["cashier-session-bill-checkout", selectedSession?.session_token],
    queryFn: () => getSessionBill(selectedSession.session_token),
    enabled: !!selectedSession,
  });

  const { data: restaurantData } = useQuery({
    queryKey: ["my-restaurant", user?.restaurant_id],
    queryFn: () => getMyRestaurant(),
    enabled: !!user,
  });

  const paymentDetails = restaurantData?.data?.payment_details;

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentRequest) => recordPayment(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["cashier-active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-today-transactions"] });
      setPaymentResult(response.data);
      setStep("complete");
      toast.success("Payment recorded successfully!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to process payment");
    },
  });

  const sessions = (sessionsData?.data || []) as any[];

  const handleSelectSession = async (session: any) => {
    setSelectedSession(session);
    try {
      const response = await getSessionBill(session.session_token);
      if (response.success) {
        setBill(response.data);
        setForm({
          session_token: session.session_token,
          amount: parseFloat(response.data.bill.total_amount),
          payment_method: "cash",
          tip_amount: 0,
          notes: "",
        });
        setStep("payment");
      }
    } catch (error) {
      toast.error("Failed to load bill");
    }
  };

  const handleSubmitPayment = () => {
    if (!bill) return;
    paymentMutation.mutate({
      session_token: form.session_token,
      amount: form.amount,
      payment_method: form.payment_method,
      tip_amount: form.tip_amount > 0 ? form.tip_amount : undefined,
      notes: form.notes || undefined,
    });
  };

  const handleNewPayment = () => {
    setStep("select");
    setSelectedSession(null);
    setBill(null);
    setPaymentResult(null);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (step === "complete" && paymentResult) {
    return (
      <>
        <div className="space-y-6 no-print">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Payment Complete</h1>
            <p className="mt-1 text-sm text-muted-foreground">Payment has been successfully processed</p>
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
                  Paid via {paymentResult.payment_method?.replace(/_/g, " ")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xs mx-auto">
                <div className="rounded-lg bg-accent/5 p-3">
                  <p className="text-xs text-muted-foreground">Bill Total</p>
                  <p className="text-lg font-semibold">{fmt(parseFloat(paymentResult.bill_total || "0"))}</p>
                </div>
                <div className="rounded-lg bg-accent/5 p-3">
                  <p className="text-xs text-muted-foreground">Tip</p>
                  <p className="text-lg font-semibold">
                    {paymentResult.tip_amount && parseFloat(paymentResult.tip_amount) > 0
                      ? fmt(parseFloat(paymentResult.tip_amount))
                      : "$0.00"}
                  </p>
                </div>
              </div>

              {paymentResult.created_at && (
                <p className="text-sm text-muted-foreground">
                  {new Date(paymentResult.created_at).toLocaleString()}
                </p>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button onClick={handleNewPayment}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  New Payment
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
        <h1 className="font-serif text-3xl text-foreground">Checkout / Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Process payments and generate receipts
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {step === "select" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Select Active Session
                </CardTitle>
                <CardDescription>
                  Choose a session to process payment
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
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No active sessions</p>
                    <p className="text-sm">All bills have been settled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
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
                          <p className="text-xs text-muted-foreground">
                            {session.order_count || 0} order(s)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "payment" && bill && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Process Payment
                </CardTitle>
                <CardDescription>
                  Table {bill.session.table_number} - {bill.session.customer_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  {parseFloat(bill.bill.discount_amount || "0") > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-emerald-600">-{fmt(parseFloat(bill.bill.discount_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>{fmt(parseFloat(bill.bill.total_amount))}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={form.payment_method}
                      onValueChange={(value: any) => {
                        setForm({ ...form, payment_method: value });
                        setSelectedAccount(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" /> Cash
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" /> Card
                          </div>
                        </SelectItem>
                        <SelectItem value="digital_wallet">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" /> Digital Wallet
                          </div>
                        </SelectItem>
                        <SelectItem value="telebirr">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" /> Digital Wallet
                          </div>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" /> Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(form.payment_method === "telebirr" || form.payment_method === "bank_transfer") && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>
                          {form.payment_method === "telebirr" ? "Wallet Account" : "Bank Account"}
                        </Label>
                        {form.payment_method === "telebirr" && paymentDetails?.wallets?.length > 0 ? (
                          <Select
                            value={selectedAccount ? JSON.stringify(selectedAccount) : ''}
                            onValueChange={(v) => setSelectedAccount(JSON.parse(v))}
                          >
                            <SelectTrigger className="h-10">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Choose a wallet" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {paymentDetails.wallets.map((w: any, i: number) => (
                                <SelectItem key={i} value={JSON.stringify(w)} className="py-2">
                                  <div>
                                    <p className="text-sm font-medium">{w.type}</p>
                                    <p className="text-xs text-muted-foreground">{w.account_name} — {w.phone}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : form.payment_method === "bank_transfer" && paymentDetails?.banks?.length > 0 ? (
                          <Select
                            value={selectedAccount ? JSON.stringify(selectedAccount) : ''}
                            onValueChange={(v) => setSelectedAccount(JSON.parse(v))}
                          >
                            <SelectTrigger className="h-10">
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Choose a bank account" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {paymentDetails.banks.map((b: any, i: number) => (
                                <SelectItem key={i} value={JSON.stringify(b)} className="py-2">
                                  <div>
                                    <p className="text-sm font-medium">{b.bank_name}</p>
                                    <p className="text-xs text-muted-foreground">{b.account_holder}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-muted-foreground/30 p-3">
                            No accounts configured.
                          </p>
                        )}
                      </div>

                      {selectedAccount && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {form.payment_method === "telebirr" ? 'Wallet Selected' : 'Account Selected'}
                          </h4>
                          {form.payment_method === "telebirr" ? (
                            <div className="text-sm text-blue-700 space-y-0.5">
                              <p><span className="text-blue-500">Provider:</span> <span className="font-semibold">{selectedAccount.type}</span></p>
                              <p><span className="text-blue-500">Name:</span> {selectedAccount.account_name}</p>
                              <p><span className="text-blue-500">Phone:</span> <span className="font-mono font-bold">{selectedAccount.phone}</span></p>
                            </div>
                          ) : (
                            <div className="text-sm text-blue-700 space-y-0.5">
                              <p><span className="text-blue-500">Bank:</span> <span className="font-semibold">{selectedAccount.bank_name}</span></p>
                              <p><span className="text-blue-500">Holder:</span> {selectedAccount.account_holder}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tip Amount (Optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.tip_amount || ""}
                      onChange={(e) => setForm({ ...form, tip_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      placeholder="Payment notes..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  {form.tip_amount > 0 && (
                    <div className="rounded-lg bg-accent/10 p-3 text-sm">
                      <span className="text-muted-foreground">Total with tip: </span>
                      <span className="font-bold">{fmt(form.amount + form.tip_amount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={paymentMutation.isPending}
                    className="flex-1"
                  >
                    {paymentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Complete Payment
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
                {selectedSession ? "Payment summary" : "No session selected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSession ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a session</p>
                  <p className="text-sm">to generate invoice</p>
                </div>
              ) : isErrorBill ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
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
