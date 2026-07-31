import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getSessionOrders,
  getSessionByToken,
  getSessionNotifications,
  type PlacedOrder,
} from "@/lib/api";
import { setDefaultCurrency } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { useT } from "@/lib/i18n";
import { fmt } from "@/lib/cart";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Loader2,
  Package,
  AlertCircle,
  PartyPopper,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const sessionToken = localStorage.getItem("sessionToken");
  const sessionDataStr = localStorage.getItem("sessionData");
  const sessionData = sessionDataStr ? JSON.parse(sessionDataStr) : null;
  const ordersRestaurantId = sessionData?.restaurant_id;
  const hasPendingOrder = localStorage.getItem("pendingOrder") === "true";

  useEffect(() => {
    if (sessionData?.currency) setDefaultCurrency(sessionData.currency);
  }, [sessionData?.currency]);

  // Poll session status to detect when cashier completes the bill
  const { data: sessionDataRes } = useQuery({
    queryKey: ["session-status", sessionToken],
    queryFn: () => getSessionByToken(sessionToken!),
    enabled: !!sessionToken,
    refetchInterval: 10000,
  });

  const sessionStatus = sessionDataRes?.data?.status;

  // Session completed — clear local data (via effect, not during render)
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    if (sessionStatus === "completed" && !cleared) {
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("sessionData");
      localStorage.removeItem("pendingTableInfo");
      localStorage.removeItem("pendingOrder");
      localStorage.removeItem("bistro-cart-v1");
      setCleared(true);
    }
  }, [sessionStatus, cleared]);

  if (sessionStatus === "completed" || cleared) {
    return <SessionCompleted />;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", sessionToken],
    queryFn: () => getSessionOrders(sessionToken!),
    enabled: !!sessionToken,
    refetchInterval: 10000,
  });

  // Poll notifications
  const { data: notifData } = useQuery({
    queryKey: ["session-notifications", sessionToken],
    queryFn: () => getSessionNotifications(sessionToken!),
    enabled: !!sessionToken,
    refetchInterval: 15000,
  });

  const orders = data?.data || [];
  const notifications = notifData?.data || [];

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.type === "payment_approved") {
        toast.success(latest.message || t("orders.paymentApprovedToast"));
        localStorage.removeItem("pendingOrder");
      } else if (latest.type === "payment_rejected") {
        toast.error(latest.message || t("orders.paymentRejectedToast"));
        localStorage.removeItem("pendingOrder");
      }
    }
  }, [notifications.length]);

  // Clear pending flag when orders appear
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.removeItem("pendingOrder");
    }
  }, [orders.length]);

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader restaurantId={ordersRestaurantId} />
        <div className="flex items-center justify-center px-4 py-24">
          <div className="max-w-md rounded-xl border border-border bg-card p-12 text-center">
            <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="font-serif text-2xl text-foreground mb-2">{t("orders.noSession")}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t("orders.scanPrompt")}</p>
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader restaurantId={ordersRestaurantId} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-foreground md:text-4xl">
              {t("orders.yourOrders")}
            </h1>
            {sessionData && (
              <p className="text-sm text-muted-foreground mt-1">
                {sessionData.table_number &&
                  t("orders.tablePrefix", { number: sessionData.table_number })}
                {sessionData.table_number && sessionData.customer_name && " · "}
                {sessionData.customer_name}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {t("orders.orderMore")}
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">{t("orders.failedToLoad")}</h3>
              <p className="text-sm text-destructive/80">{t("orders.tryAgainLater")}</p>
            </div>
          </div>
        )}

        {/* Pending Verification State */}
        {!isLoading && !error && orders.length === 0 && hasPendingOrder && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-12 text-center">
            <Timer className="mx-auto h-16 w-16 text-amber-500 mb-4 animate-pulse" />
            <h2 className="font-serif text-xl text-foreground mb-2">
              {t("orders.pendingVerification")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("orders.pendingVerificationSub")}
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("orders.orderMore")}
            </button>
          </div>
        )}

        {/* Empty State - no orders placed */}
        {!isLoading && !error && orders.length === 0 && !hasPendingOrder && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ChefHat className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">{t("orders.noOrdersYet")}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t("orders.placeFirstOrder")}</p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("common.browseMenu")}
            </button>
          </div>
        )}

        {/* Orders List */}
        {!isLoading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}

            {/* Session Bill Summary */}
            <div className="rounded-xl border-2 border-primary/20 bg-card p-6">
              <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("orders.sessionTotal")}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-foreground">
                  <span>{t("orders.subtotal")}</span>
                  <span className="font-semibold">
                    {fmt(orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("orders.tax")}</span>
                  <span>{fmt(orders.reduce((sum, o) => sum + parseFloat(o.tax_amount), 0))}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("orders.serviceCharge")}</span>
                  <span>
                    {fmt(orders.reduce((sum, o) => sum + parseFloat(o.service_charge), 0))}
                  </span>
                </div>
                <div className="border-t-2 border-border pt-3">
                  <div className="flex justify-between">
                    <span className="font-serif text-2xl text-foreground">{t("orders.total")}</span>
                    <span className="font-serif text-2xl text-primary font-bold">
                      {fmt(orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCompleted() {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-12 text-center">
        <PartyPopper className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-2">{t("orders.thankYou")}</h1>
        <p className="text-muted-foreground mb-6">{t("orders.billPaid")}</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t("common.browseMenu")}
        </button>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: PlacedOrder }) {
  const { t } = useT();
  const statusConfig = {
    pending: {
      icon: Clock,
      label: t("orders.status.orderReceived"),
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    confirmed: {
      icon: CheckCircle2,
      label: t("orders.status.confirmed"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    preparing: {
      icon: ChefHat,
      label: t("orders.status.preparing"),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    ready: {
      icon: CheckCircle2,
      label: t("orders.status.ready"),
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    served: {
      icon: CheckCircle2,
      label: t("orders.status.served"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  };

  const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border-2 ${config.borderColor} bg-card p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-serif text-xl sm:text-2xl text-foreground truncate">
            {t("orders.orderNumber", { number: order.order_number })}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full ${config.bgColor} px-4 py-2 ${config.color}`}
        >
          <Icon className="h-5 w-5" />
          <span className="text-sm font-semibold">{config.label}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-start py-2 border-b border-border last:border-b-0"
          >
            <div className="flex-1">
              <span className="text-foreground font-medium">
                {item.quantity}x {item.menu_item_name || item.item_name}
              </span>
              {item.special_instructions && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  {t("orders.note", { instructions: item.special_instructions })}
                </p>
              )}
            </div>
            <span className="font-semibold text-foreground ml-4">
              {fmt(parseFloat(item.total_price))}
            </span>
          </div>
        ))}
      </div>

      {/* Order-level Special Instructions */}
      {order.special_instructions && (
        <div className="rounded-lg bg-muted p-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("orders.orderInstructions")}
          </p>
          <p className="text-sm text-foreground">{order.special_instructions}</p>
        </div>
      )}

      {/* Order Total */}
      <div className="flex justify-between items-center border-t-2 border-border pt-4">
        <span className="text-sm font-semibold text-foreground">{t("orders.orderTotal")}</span>
        <span className="font-serif text-xl text-primary font-bold">
          {fmt(parseFloat(order.total_amount))}
        </span>
      </div>
    </div>
  );
}
