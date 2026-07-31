import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart, fmt, setDefaultCurrency } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import {
  placeOrder,
  createSession,
  getSessionByToken,
  getSessionOrders,
  getSessionNotifications,
  type PaymentDetails,
} from "@/lib/api";
import { toast } from "sonner";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  Loader2,
  MapPin,
  User,
  Table as TableIcon,
  Trash2,
  Plus,
  Minus,
  Smartphone,
  Building2,
  Banknote,
  Wallet,
  Landmark,
  XCircle,
  Timer,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const { items, count, total, clear, updateQuantity, remove } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [orderInstructions, setOrderInstructions] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCreatedAt, setOrderCreatedAt] = useState<string | null>(null);
  const [pendingTableInfo, setPendingTableInfo] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [fetchingSession, setFetchingSession] = useState(false);
  const [step, setStep] = useState<
    "checkout" | "payment-method" | "payment-details" | "confirmation"
  >("checkout");

  // Payment form state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [transactionId, setTransactionId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const sessionToken = localStorage.getItem("sessionToken");
  const sessionDataStr = localStorage.getItem("sessionData");

  // Poll orders during confirmation step — if the current order appears, it's been approved
  const { data: ordersData } = useQuery({
    queryKey: ["cart-orders", sessionToken],
    queryFn: () => getSessionOrders(sessionToken!),
    enabled: !!sessionToken && step === "confirmation",
    refetchInterval: 5000,
  });

  // Poll notifications for rejection status
  const { data: notifData } = useQuery({
    queryKey: ["cart-notifications", sessionToken],
    queryFn: () => getSessionNotifications(sessionToken!),
    enabled: !!sessionToken && step === "confirmation",
    refetchInterval: 5000,
  });

  // Initialize state with localStorage data on mount
  const [currentSessionData, setCurrentSessionData] = useState<any>(() => {
    return sessionDataStr ? JSON.parse(sessionDataStr) : null;
  });

  // Use currentSessionData as sessionData
  const sessionData = currentSessionData;

  // Check if we have pending table info (scanned QR but no session yet)
  useEffect(() => {
    if (!sessionToken) {
      const stored = localStorage.getItem("pendingTableInfo");
      if (stored) {
        const parsed = JSON.parse(stored);
        setPendingTableInfo(parsed);
        setPaymentDetails(parsed.payment_details || null);
      }
    } else {
      // Sync currentSessionData with localStorage when component mounts
      const sessionDataStr = localStorage.getItem("sessionData");
      if (sessionDataStr) {
        const parsed = JSON.parse(sessionDataStr);
        setCurrentSessionData(parsed);
        if (parsed.payment_details) {
          setPaymentDetails(parsed.payment_details);
        }
      }
      // Fetch fresh session data to get payment_details
      if (sessionToken) {
        setFetchingSession(true);
        getSessionByToken(sessionToken)
          .then((res) => {
            const session = res.data;
            if (session.payment_details) {
              setPaymentDetails(session.payment_details);
            }
            // Enrich localStorage with payment_details
            const existing = localStorage.getItem("sessionData");
            if (existing) {
              const enriched = {
                ...JSON.parse(existing),
                payment_details: session.payment_details,
                currency: session.currency,
              };
              localStorage.setItem("sessionData", JSON.stringify(enriched));
              setCurrentSessionData(enriched);
            }
          })
          .catch(() => {})
          .finally(() => setFetchingSession(false));
      }
    }
  }, [sessionToken]);

  // Calculate tax and service charge
  const restaurantInfo = sessionData || pendingTableInfo;
  const cartRestaurantId = restaurantInfo?.restaurant_id;
  const taxRate = restaurantInfo?.tax_rate || 8.5;
  const serviceChargeRate = restaurantInfo?.service_charge_rate || 10;
  const currency = restaurantInfo?.currency;
  useEffect(() => {
    if (currency) setDefaultCurrency(currency);
  }, [currency]);

  const subtotal = total;
  const tax = (subtotal * taxRate) / 100;
  const serviceCharge = (subtotal * serviceChargeRate) / 100;
  const grandTotal = subtotal + tax + serviceCharge;

  const handleStartOrdering = () => {
    if (items.length === 0) {
      toast.error(t("cart.cartEmptyToast"));
      return;
    }

    if (!sessionToken && !pendingTableInfo) {
      toast.error(t("cart.scanQrToast"));
      return;
    }

    setSelectedPaymentMethod("cash");
    setSelectedAccount(null);
    setTransactionId("");
    setPayerName(sessionData?.customer_name || "");
    setCustomerPhone(sessionData?.customer_phone || "");

    setStep("payment-method");
  };

  const handleConfirmOrder = async () => {
    if (!payerName.trim()) {
      toast.error(t("cart.enterNameToast"));
      return;
    }

    // Validate non-cash payment requires transaction ID
    if (selectedPaymentMethod !== "cash" && !transactionId.trim()) {
      toast.error(t("cart.enterTransactionIdToast"));
      return;
    }

    setSubmitting(true);
    try {
      // Auto-create session if none exists
      let token = sessionToken;
      if (!token) {
        if (!pendingTableInfo) {
          toast.error(t("cart.noTableToast"));
          setSubmitting(false);
          return;
        }
        const sessionResponse = await createSession({
          table_id: pendingTableInfo.id,
          customer_name: payerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
        });
        const sessionResult = sessionResponse.data;
        const enrichedSessionData = {
          ...sessionResult,
          table_number: pendingTableInfo.table_number,
          location: pendingTableInfo.location,
          capacity: pendingTableInfo.capacity,
          restaurant_name: pendingTableInfo.restaurant_name,
          restaurant_logo: pendingTableInfo.restaurant_logo,
          tax_rate: pendingTableInfo.tax_rate,
          service_charge_rate: pendingTableInfo.service_charge_rate,
          currency: pendingTableInfo.currency || "ETB",
          payment_details: pendingTableInfo.payment_details || sessionResult.payment_details,
          orders: [],
        };
        localStorage.setItem("sessionToken", sessionResult.session_token);
        localStorage.setItem("sessionData", JSON.stringify(enrichedSessionData));
        localStorage.removeItem("pendingTableInfo");
        token = sessionResult.session_token;
      }

      const orderItems = items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        selected_variants: item.selectedVariants.length > 0 ? item.selectedVariants : undefined,
        special_instructions: item.specialInstructions,
      }));

      const response = await placeOrder({
        session_token: token!,
        items: orderItems,
        special_instructions: orderInstructions.trim() || undefined,
        payment_method: selectedPaymentMethod as any,
        transaction_id: selectedPaymentMethod !== "cash" ? transactionId.trim() : undefined,
        payment_account:
          selectedPaymentMethod !== "cash" && selectedAccount ? selectedAccount : undefined,
      });

      setStep("confirmation");
      setOrderNumber(response.data.order_number);
      setOrderId(response.data.id);
      setOrderCreatedAt(response.data.created_at);
      localStorage.setItem("pendingOrder", "true");
      clear();
      setOrderInstructions("");
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast.error(error.message || t("cart.failedToPlace"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    navigate({ to: "/orders" });
  };

  // Redirect if cart is empty (but NOT if on confirmation step)
  if (items.length === 0 && step !== "confirmation") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader restaurantId={cartRestaurantId} />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ShoppingBag className="mx-auto h-20 w-20 text-muted-foreground mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">{t("cart.emptyTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("cart.emptySubtitle")}</p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("common.browseMenu")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if no session AND no pending table info (but NOT if on confirmation step)
  if (!sessionData && !pendingTableInfo && step !== "confirmation") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader restaurantId={cartRestaurantId} />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">{t("cart.noSession")}</p>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("cart.goHome")}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // STEP 3: CONFIRMATION
  // =========================================================
  if (step === "confirmation") {
    const confirmedOrders = ordersData?.data || [];
    const notifications = notifData?.data || [];

    // Payment is approved when our specific order appears in getSessionOrders
    const paymentApproved = orderId
      ? confirmedOrders.some((o: any) => o.id === orderId)
      : confirmedOrders.length > 0;

    // Payment is rejected when a rejection notification exists AFTER our order was placed
    const paymentRejected = orderCreatedAt
      ? notifications.some(
          (n: any) =>
            n.type === "payment_rejected" && new Date(n.created_at) > new Date(orderCreatedAt),
        )
      : notifications.some((n: any) => n.type === "payment_rejected");

    if (paymentApproved) {
      return (
        <div className="min-h-screen bg-background">
          <SiteHeader restaurantId={cartRestaurantId} />
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <div className="rounded-full bg-green-100 p-4 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("cart.approvedTitle")}</h1>
            <p className="text-muted-foreground mb-2">{t("cart.approvedSubtitle")}</p>
            <p className="text-5xl font-bold text-primary mb-8">#{orderNumber}</p>
            <button
              onClick={() => navigate({ to: "/orders" })}
              className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              {t("cart.viewOrder")}
            </button>
          </div>
        </div>
      );
    }

    if (paymentRejected) {
      return (
        <div className="min-h-screen bg-background">
          <SiteHeader restaurantId={cartRestaurantId} />
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <div className="rounded-full bg-red-100 p-4 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("cart.rejectedTitle")}</h1>
            <p className="text-muted-foreground mb-6">{t("cart.rejectedSubtitle")}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate({ to: "/" })}
                className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {t("cart.retryPayment")}
              </button>
              <button
                onClick={() => toast.info(t("cart.contactStaffInfo"))}
                className="w-full rounded-xl border border-border bg-background px-6 py-4 text-lg font-semibold text-foreground hover:bg-accent"
              >
                {t("cart.contactStaff")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Still pending
    const paymentMethodLabel =
      selectedPaymentMethod === "cash"
        ? t("cart.cash")
        : selectedPaymentMethod === "telebirr"
          ? t("cart.digitalWallet")
          : t("cart.bankTransfer");

    return (
      <div className="min-h-screen bg-background">
        <SiteHeader restaurantId={cartRestaurantId} />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="rounded-full bg-amber-100 p-4 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Timer className="h-12 w-12 text-amber-600 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("cart.verificationTitle")}</h1>
          <p className="text-muted-foreground mb-2">{t("cart.referenceNumber")}</p>
          <p className="text-5xl font-bold text-primary mb-4">#{orderNumber}</p>
          <div className="rounded-xl border border-border bg-card p-4 mb-8 text-sm text-muted-foreground space-y-1">
            <p>
              {t("cart.payment")}{" "}
              <span className="font-semibold text-foreground">{paymentMethodLabel}</span>
            </p>
            {selectedPaymentMethod !== "cash" && (
              <p>
                {t("cart.transactionId")}{" "}
                <span className="font-semibold text-foreground">{transactionId}</span>
              </p>
            )}
            <p>{t("cart.waitingVerification")}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("cart.waiting")}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // STEP 2: PAYMENT DETAILS
  // =========================================================
  if (step === "payment-details") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader restaurantId={cartRestaurantId} />
        <div className="mx-auto max-w-lg px-4 py-8">
          <button
            onClick={() => setStep("payment-method")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cart.backToPaymentMethod")}
          </button>

          <h1 className="text-2xl font-bold text-foreground mb-6">
            {t("cart.paymentDetailsTitle")}
          </h1>

          {/* Selected account info */}
          {selectedPaymentMethod !== "cash" && selectedAccount && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-blue-100 p-2">
                  {selectedPaymentMethod === "telebirr" ? (
                    <Smartphone className="h-5 w-5 text-blue-700" />
                  ) : (
                    <Building2 className="h-5 w-5 text-blue-700" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800 text-sm">
                    {selectedPaymentMethod === "telebirr"
                      ? t("cart.sendToWallet")
                      : t("cart.transferToAccount")}
                  </h3>
                  <p className="text-xs text-blue-600">{t("cart.sendExactAmount")}</p>
                </div>
              </div>
              <div className="border-t border-blue-200 pt-3">
                {selectedPaymentMethod === "telebirr" ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-blue-700">
                    <span className="text-blue-500">{t("cart.provider")}</span>
                    <span className="font-semibold text-blue-800 text-right">
                      {selectedAccount.type}
                    </span>
                    <span className="text-blue-500">{t("cart.accountName")}</span>
                    <span className="font-semibold text-blue-800 text-right">
                      {selectedAccount.account_name}
                    </span>
                    <span className="text-blue-500">{t("cart.phone")}</span>
                    <span className="font-mono font-bold text-blue-800 text-right text-base">
                      {selectedAccount.phone}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-blue-700">
                    <span className="text-blue-500">{t("cart.bank")}</span>
                    <span className="font-semibold text-blue-800 text-right">
                      {selectedAccount.bank_name}
                    </span>
                    <span className="text-blue-500">{t("cart.accountHolder")}</span>
                    <span className="font-semibold text-blue-800 text-right">
                      {selectedAccount.account_holder}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("cart.yourName")}
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("cart.namePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("cart.phoneOptional")}
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("cart.phonePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("cart.paymentMethod")}
              </label>
              <div className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm">
                {selectedPaymentMethod === "cash" ? (
                  <span className="text-muted-foreground">{t("cart.cash")}</span>
                ) : selectedPaymentMethod === "telebirr" && selectedAccount ? (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="font-medium">{selectedAccount.type}</span>
                    <span className="font-mono text-xs">{selectedAccount.phone}</span>
                  </div>
                ) : selectedPaymentMethod === "bank_transfer" && selectedAccount ? (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="font-medium">{selectedAccount.bank_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedAccount.account_holder}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {selectedPaymentMethod === "telebirr"
                      ? t("cart.digitalWallet")
                      : t("cart.bankTransfer")}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("cart.totalAmount", { currency: currency || "ETB" })}
              </label>
              <div className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm font-bold text-foreground">
                {fmt(grandTotal, currency)}
              </div>
            </div>

            {selectedPaymentMethod !== "cash" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("cart.transactionIdLabel")}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t("cart.transactionIdPlaceholder")}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t("cart.transactionRefHint", {
                    method:
                      selectedPaymentMethod === "telebirr"
                        ? t("cart.refWallet")
                        : t("cart.refBank"),
                  })}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={submitting || (selectedPaymentMethod !== "cash" && !transactionId.trim())}
            className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 mt-8"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("cart.processing")}
              </span>
            ) : (
              t("cart.placeOrder")
            )}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // STEP 1: PAYMENT METHOD SELECTION
  // =========================================================
  if (step === "payment-method") {
    const methodOptions = [
      { id: "cash", label: t("cart.cash"), icon: Banknote, desc: t("cart.payAtCounter") },
      {
        id: "telebirr",
        label: t("cart.digitalWallet"),
        icon: Smartphone,
        desc: t("cart.walletDesc"),
      },
      {
        id: "bank_transfer",
        label: t("cart.bankTransfer"),
        icon: Building2,
        desc: t("cart.bankDesc"),
      },
    ];
    const selectedMethod = methodOptions.find((m) => m.id === selectedPaymentMethod);
    const Icon = selectedMethod?.icon;
    const wallets = paymentDetails?.wallets || [];
    const banks = paymentDetails?.banks || [];
    const showAccounts =
      selectedPaymentMethod === "telebirr" || selectedPaymentMethod === "bank_transfer";

    return (
      <div className="min-h-screen bg-background">
        <SiteHeader restaurantId={cartRestaurantId} />
        <div className="mx-auto max-w-lg px-4 py-12">
          <button
            onClick={() => setStep("checkout")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cart.backToCart")}
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {t("cart.choosePaymentMethod")}
            </h1>
            <p className="text-muted-foreground text-sm">{t("cart.selectHowToPay")}</p>
          </div>

          <div className="space-y-6">
            {/* Payment method select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {t("cart.paymentMethod")}
              </Label>
              <Select
                value={selectedPaymentMethod}
                onValueChange={(v) => {
                  setSelectedPaymentMethod(v);
                  setSelectedAccount(null);
                  setTransactionId("");
                }}
              >
                <SelectTrigger className="h-12 px-4 text-base">
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                    <SelectValue placeholder={t("cart.selectPaymentMethod")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((m) => {
                    const MIcon = m.icon;
                    return (
                      <SelectItem key={m.id} value={m.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <MIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{m.label}</p>
                            <p className="text-xs text-muted-foreground">{m.desc}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Account selection for non-cash */}
            {showAccounts && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  {selectedPaymentMethod === "telebirr"
                    ? t("cart.walletAccount")
                    : t("cart.bankAccount")}
                </Label>
                {selectedPaymentMethod === "telebirr" && wallets.length > 0 ? (
                  <Select
                    value={selectedAccount ? JSON.stringify(selectedAccount) : ""}
                    onValueChange={(v) => setSelectedAccount(JSON.parse(v))}
                  >
                    <SelectTrigger className="h-12 px-4 text-base">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder={t("cart.chooseWallet")} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((w: any, i: number) => (
                        <SelectItem key={i} value={JSON.stringify(w)} className="py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                              <p className="text-sm font-medium">{w.type}</p>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                              {w.account_name} — {w.phone}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedPaymentMethod === "bank_transfer" && banks.length > 0 ? (
                  <Select
                    value={selectedAccount ? JSON.stringify(selectedAccount) : ""}
                    onValueChange={(v) => setSelectedAccount(JSON.parse(v))}
                  >
                    <SelectTrigger className="h-12 px-4 text-base">
                      <div className="flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder={t("cart.chooseBankAccount")} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b: any, i: number) => (
                        <SelectItem key={i} value={JSON.stringify(b)} className="py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <p className="text-sm font-medium">{b.bank_name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                              {b.account_holder} — {b.account_number}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground">
                    {t("cart.noAccounts")}
                  </div>
                )}

                {/* Show selected account details */}
                {selectedAccount && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mt-2">
                    {selectedPaymentMethod === "telebirr" ? (
                      <div className="text-sm text-blue-700 space-y-0.5">
                        <p className="font-semibold text-blue-800">{selectedAccount.type}</p>
                        <p>Name: {selectedAccount.account_name}</p>
                        <p className="font-mono font-bold">{selectedAccount.phone}</p>
                      </div>
                    ) : (
                      <div className="text-sm text-blue-700 space-y-0.5">
                        <p className="font-semibold text-blue-800">{selectedAccount.bank_name}</p>
                        <p>Holder: {selectedAccount.account_holder}</p>
                        <p className="font-mono font-bold">{selectedAccount.account_number}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setStep("payment-details")}
              disabled={selectedPaymentMethod === "cash" ? false : !selectedAccount}
              className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
            >
              {t("cart.continue")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // CHECKOUT (default step)
  // =========================================================
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader restaurantId={cartRestaurantId} />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cart.backToMenu")}
          </button>
          <h1 className="font-serif text-3xl font-bold text-foreground flex-1">
            {t("cart.checkout")}
          </h1>
        </div>

        {/* Session Info */}
        {sessionData && sessionData.table_number && (
          <div className="rounded-xl border border-border bg-card p-6 mb-4">
            <h2 className="font-semibold text-lg text-foreground mb-4">{t("cart.diningInfo")}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TableIcon className="h-4 w-4" />
                  <span className="text-sm">{t("cart.table")}</span>
                </div>
                <span className="font-semibold text-foreground">{sessionData.table_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{t("cart.customer")}</span>
                </div>
                <span className="font-semibold text-foreground">{sessionData.customer_name}</span>
              </div>
              {sessionData.location && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{t("cart.location")}</span>
                  </div>
                  <span className="font-semibold text-foreground">{sessionData.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="font-semibold text-lg text-foreground mb-4">
            {t("cart.orderSummary", {
              count,
              items: count === 1 ? t("cart.item") : t("cart.items"),
            })}
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-background p-3 sm:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fmt(item.price, currency)} {t("cart.each")}
                    </p>

                    {/* Variants */}
                    {item.selectedVariants && item.selectedVariants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.selectedVariants.map((variant: any, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {variant.variant_name}: {variant.option_name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Special Instructions */}
                    {item.specialInstructions && (
                      <p className="text-xs italic text-muted-foreground mt-2 bg-muted px-2 py-1 rounded">
                        {t("cart.note", { instructions: item.specialInstructions })}
                      </p>
                    )}
                  </div>

                  {/* Price and Controls */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-between gap-3 sm:gap-0">
                    <p className="font-serif text-lg font-semibold text-foreground">
                      {fmt(item.itemTotal, currency)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            remove(item.id);
                            toast.success(t("cart.itemRemoved"));
                          }
                        }}
                        className="flex items-center justify-center rounded-full border border-border bg-background h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label={t("cart.decreaseQty")}
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>

                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex items-center justify-center rounded-full border border-border bg-background h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label={t("cart.increaseQty")}
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          remove(item.id);
                          toast.success(t("cart.itemRemoved"));
                        }}
                        className="flex items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 h-9 w-9 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        aria-label={t("cart.removeItem")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Instructions */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="font-semibold text-lg text-foreground mb-3">
            {t("cart.specialInstructions")}
          </h2>
          <textarea
            value={orderInstructions}
            onChange={(e) => setOrderInstructions(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder={t("cart.specialInstructionsPlaceholder")}
          />
        </div>

        {/* Price Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="font-semibold text-lg text-foreground mb-4">{t("cart.paymentSummary")}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground">{t("cart.subtotal")}</span>
              <span className="font-semibold">{fmt(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("cart.tax", { rate: taxRate })}</span>
              <span className="text-muted-foreground">{fmt(tax, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("cart.serviceCharge", { rate: serviceChargeRate })}
              </span>
              <span className="text-muted-foreground">{fmt(serviceCharge, currency)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-xl font-bold text-foreground">{t("cart.total")}</span>
                <span className="text-xl font-bold text-primary">{fmt(grandTotal, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Place Order / Start Order Button */}
        <button
          onClick={handleStartOrdering}
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("cart.processing")}
            </span>
          ) : (
            t("cart.placeOrder")
          )}
        </button>
      </div>
    </div>
  );
}
